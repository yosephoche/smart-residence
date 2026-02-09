import { House, HouseType } from "@/types";

// Mock House Types
export const mockHouseTypes: HouseType[] = [
  {
    id: "1",
    typeName: "Tipe 36",
    price: 150000,
    description: "Rumah tipe 36 dengan luas tanah 72m²",
  },
  {
    id: "2",
    typeName: "Tipe 45",
    price: 200000,
    description: "Rumah tipe 45 dengan luas tanah 90m²",
  },
  {
    id: "3",
    typeName: "Tipe 60",
    price: 250000,
    description: "Rumah tipe 60 dengan luas tanah 120m²",
  },
];

// Mock Houses
export const mockHouses: House[] = [
  {
    id: "1",
    houseNumber: "A-01",
    block: "A",
    houseTypeId: "1",
    userId: "2", // John Doe
  },
  {
    id: "2",
    houseNumber: "A-02",
    block: "A",
    houseTypeId: "2",
    userId: "3", // Jane Smith
  },
  {
    id: "3",
    houseNumber: "B-01",
    block: "B",
    houseTypeId: "3",
    userId: "4", // Bob Wilson
  },
  {
    id: "4",
    houseNumber: "B-02",
    block: "B",
    houseTypeId: "1",
    userId: undefined, // Unassigned
  },
  {
    id: "5",
    houseNumber: "C-01",
    block: "C",
    houseTypeId: "2",
    userId: undefined, // Unassigned
  },
];

// House Type Helper Functions
export function getAllHouseTypes(): HouseType[] {
  return [...mockHouseTypes];
}

export function findHouseTypeById(id: string): HouseType | undefined {
  return mockHouseTypes.find((type) => type.id === id);
}

export function createHouseType(
  typeName: string,
  price: number,
  description?: string
): HouseType {
  const newType: HouseType = {
    id: (mockHouseTypes.length + 1).toString(),
    typeName,
    price,
    description,
  };
  mockHouseTypes.push(newType);
  return newType;
}

export function updateHouseType(
  id: string,
  updates: Partial<Omit<HouseType, "id">>
): HouseType | null {
  const type = mockHouseTypes.find((t) => t.id === id);
  if (!type) return null;

  Object.assign(type, updates);
  return type;
}

export function deleteHouseType(id: string): boolean {
  const index = mockHouseTypes.findIndex((t) => t.id === id);
  if (index === -1) return false;

  // Check if any houses use this type
  const housesWithType = mockHouses.filter((h) => h.houseTypeId === id);
  if (housesWithType.length > 0) {
    return false; // Cannot delete house type in use
  }

  mockHouseTypes.splice(index, 1);
  return true;
}

// House Helper Functions
export function getAllHouses(): House[] {
  return mockHouses.map((house) => ({
    ...house,
    houseType: findHouseTypeById(house.houseTypeId),
  }));
}

export function findHouseById(id: string): House | undefined {
  const house = mockHouses.find((h) => h.id === id);
  if (!house) return undefined;

  return {
    ...house,
    houseType: findHouseTypeById(house.houseTypeId),
  };
}

export function findHousesByUserId(userId: string): House[] {
  return mockHouses
    .filter((h) => h.userId === userId)
    .map((house) => ({
      ...house,
      houseType: findHouseTypeById(house.houseTypeId),
    }));
}

export function createHouse(
  houseNumber: string,
  block: string,
  houseTypeId: string,
  userId?: string
): House {
  const newHouse: House = {
    id: (mockHouses.length + 1).toString(),
    houseNumber,
    block,
    houseTypeId,
    userId,
  };

  mockHouses.push(newHouse);
  return {
    ...newHouse,
    houseType: findHouseTypeById(houseTypeId),
  };
}

export function updateHouse(
  id: string,
  updates: Partial<Omit<House, "id">>
): House | null {
  const house = mockHouses.find((h) => h.id === id);
  if (!house) return null;

  Object.assign(house, updates);
  return {
    ...house,
    houseType: findHouseTypeById(house.houseTypeId),
  };
}

export function deleteHouse(id: string): boolean {
  const index = mockHouses.findIndex((h) => h.id === id);
  if (index === -1) return false;

  mockHouses.splice(index, 1);
  return true;
}
