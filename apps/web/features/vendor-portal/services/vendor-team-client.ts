import type { VendorRole, VendorTeamMember } from "@albora/db";

type TeamResponse = { members: VendorTeamMember[] };

async function request(url: string, init?: RequestInit): Promise<VendorTeamMember[]> {
  const response = await fetch(url, init);
  const body = (await response.json().catch(() => ({}))) as Partial<TeamResponse> & { message?: string };
  if (!response.ok) throw new Error(body.message ?? "Não foi possível atualizar a equipe");
  return body.members ?? [];
}

function json(method: string, body: unknown): RequestInit {
  return { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) };
}

export const vendorTeamClient = {
  invite(vendorId: string, input: { email: string; role: VendorRole }) {
    return request(`/api/vendors/${vendorId}/members`, json("POST", input));
  },
  updateRole(vendorId: string, accountId: string, role: VendorRole) {
    return request(`/api/vendors/${vendorId}/members/${accountId}`, json("PATCH", { role }));
  },
  remove(vendorId: string, accountId: string) {
    return request(`/api/vendors/${vendorId}/members/${accountId}`, { method: "DELETE" });
  },
};
