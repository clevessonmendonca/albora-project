import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useMissionCompletionToast } from "./use-mission-completion-toast";
import type { VisibleMission } from "../components/client/missions-page";
import { MISSIONS_PROGRESS_KEY } from "../lib/missions-utils";

function mission(id: string, done: boolean): VisibleMission {
  return { id, title: `Missão ${id}`, done };
}

describe("useMissionCompletionToast", () => {
  afterEach(() => {
    localStorage.removeItem(MISSIONS_PROGRESS_KEY);
  });

  it("não dispara na primeira visita", () => {
    const missions = [mission("a", true), mission("b", false)];
    const { result } = renderHook(() => useMissionCompletionToast(missions));
    expect(result.current.event).toBeNull();
  });

  it("dispara quando uma missão recém-completa aparece", () => {
    localStorage.setItem(MISSIONS_PROGRESS_KEY, "a:false|b:false");
    const missions = [mission("a", true), mission("b", false)];
    const { result } = renderHook(() => useMissionCompletionToast(missions));
    expect(result.current.event?.mission.id).toBe("a");
    expect(result.current.event?.milestone).toBe("individual");
    expect(result.current.event?.nextMission?.id).toBe("b");
  });

  it("marca milestone all quando a última missão fecha", () => {
    localStorage.setItem(MISSIONS_PROGRESS_KEY, "a:true|b:false");
    const missions = [mission("a", true), mission("b", true)];
    const { result } = renderHook(() => useMissionCompletionToast(missions));
    expect(result.current.event?.milestone).toBe("all");
  });

  it("dismiss limpa o evento", () => {
    localStorage.setItem(MISSIONS_PROGRESS_KEY, "a:false|b:false");
    const missions = [mission("a", true), mission("b", false)];
    const { result } = renderHook(() => useMissionCompletionToast(missions));
    act(() => result.current.dismiss());
    expect(result.current.event).toBeNull();
  });
});
