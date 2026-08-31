/**
 * Testes: Admin Vendors Use Case
 * 
 * Cobertura:
 * - listAdminVendors: lista fornecedores da conta
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { listAdminVendors } from "./list-admin-vendors";
import type { Pool } from "pg";

// Mocks usando vi.hoisted
const { mockVendorsDaConta } = vi.hoisted(() => ({
  mockVendorsDaConta: vi.fn(),
}));

vi.mock("@albora/db", () => ({
  vendorsDaConta: mockVendorsDaConta,
}));

describe("listAdminVendors", () => {
  let mockPool: Pool;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPool = {} as Pool;
  });

  const createInput = (overrides = {}) => ({
    accountId: "acc-123",
    ...overrides,
  });

  it("deve listar vendors do admin", async () => {
    const vendorsMock = [
      { vendorId: "v1", name: "Fornecedor A", role: "admin" },
      { vendorId: "v2", name: "Fornecedor B", role: "staff" },
    ];

    mockVendorsDaConta.mockResolvedValue(vendorsMock);

    const input = createInput();
    const result = await listAdminVendors(input, mockPool);

    expect(result.vendors).toEqual(vendorsMock);
    expect(result.vendors).toHaveLength(2);
    expect(mockVendorsDaConta).toHaveBeenCalledWith(mockPool, "acc-123");
  });

  it("deve retornar array vazio quando não há vendors", async () => {
    mockVendorsDaConta.mockResolvedValue([]);

    const input = createInput();
    const result = await listAdminVendors(input, mockPool);

    expect(result.vendors).toEqual([]);
  });

  it("deve incluir role de cada vendor", async () => {
    const vendorsMock = [
      { vendorId: "v1", name: "Vendor 1", role: "admin" },
      { vendorId: "v2", name: "Vendor 2", role: "staff" },
    ];

    mockVendorsDaConta.mockResolvedValue(vendorsMock);

    const input = createInput();
    const result = await listAdminVendors(input, mockPool);

    expect(result.vendors[0]!.role).toBe("admin");
    expect(result.vendors[1]!.role).toBe("staff");
  });

  it("deve funcionar com múltiplos vendors", async () => {
    const vendorsMock = Array.from({ length: 5 }, (_, i) => ({
      vendorId: `v${i}`,
      name: `Vendor ${i}`,
      role: i % 2 === 0 ? "admin" : "staff",
    }));

    mockVendorsDaConta.mockResolvedValue(vendorsMock);

    const input = createInput();
    const result = await listAdminVendors(input, mockPool);

    expect(result.vendors).toHaveLength(5);
  });
});
