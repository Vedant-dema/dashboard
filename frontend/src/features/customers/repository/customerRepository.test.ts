import { beforeEach, describe, expect, it, vi } from "vitest";

import type { KundenDbState } from "../../../types/kunden";

const seededState: KundenDbState = {
  version: 1,
  kunden: [],
  kundenWash: [],
  rollen: [],
  unterlagen: [],
  termine: [],
  beziehungen: [],
  risikoanalysen: [],
  history: [],
  nextKundeId: 1,
  nextWashId: 1,
  nextRolleId: 1,
  nextUnterlageId: 1,
  nextTerminId: 1,
  nextBeziehungId: 1,
  nextRisikoanalyseId: 1,
  nextHistoryId: 1,
};

vi.mock("../../../store/kundenStore", async () => {
  const actual = await vi.importActual<typeof import("../../../store/kundenStore")>(
    "../../../store/kundenStore"
  );
  return {
    ...actual,
    loadKundenDb: vi.fn(() => seededState),
    saveKundenDb: vi.fn(),
    isCustomersApiMode: vi.fn(() => true),
    loadSharedKundenDb: vi.fn(async () => seededState),
    saveSharedKundenDb: vi.fn(async (state: KundenDbState) => state),
  };
});

import * as kundenStore from "../../../store/kundenStore";
import { customerRepository } from "./customerRepository";

describe("customerRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates local db load/save to store functions", () => {
    const loaded = customerRepository.loadLocalDb();
    expect(loaded).toEqual(seededState);
    expect(kundenStore.loadKundenDb).toHaveBeenCalledTimes(1);

    customerRepository.saveLocalDb(seededState);
    expect(kundenStore.saveKundenDb).toHaveBeenCalledWith(seededState);
  });

  it("exposes api mode and shared db delegates", async () => {
    expect(customerRepository.isApiMode()).toBe(true);
    expect(kundenStore.isCustomersApiMode).toHaveBeenCalledTimes(1);

    const remote = await customerRepository.loadSharedDb();
    expect(remote).toEqual(seededState);
    expect(kundenStore.loadSharedKundenDb).toHaveBeenCalledTimes(1);

    const saved = await customerRepository.saveSharedDb(seededState);
    expect(saved).toEqual(seededState);
    expect(kundenStore.saveSharedKundenDb).toHaveBeenCalledWith(seededState);
  });
});
