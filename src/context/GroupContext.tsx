import React, { createContext, useContext, useState } from "react";
import { useGroupAPI } from "../api/api";
import { ProjectGroup } from "../../types/group";

type GroupContextValue = {
  groups: ProjectGroup[] | null;
  loadGroups: () => Promise<void>;
  createGroup: (name: string, icon?: string, color?: string) => Promise<ProjectGroup>;
  editGroup: (id: string, updates: Partial<ProjectGroup>) => Promise<void>;
  deleteGroupItem: (id: string) => Promise<void>;
};

const GroupContext = createContext<GroupContextValue | null>(null);

export const GroupContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [groups, setGroups] = useState<ProjectGroup[] | null>(null);
  const { getAllGroups, addGroup, updateGroup, deleteGroup } = useGroupAPI();

  const loadGroups = async () => {
    const data = await getAllGroups();
    setGroups(data);
  };

  const createGroup = async (name: string, icon?: string, color?: string) => {
    const created = await addGroup({ name, icon, color });
    setGroups((prev) => (prev ? [...prev, created] : [created]));
    return created;
  };

  const editGroup = async (id: string, updates: Partial<ProjectGroup>) => {
    await updateGroup(id, updates);
    setGroups((prev) =>
      prev ? prev.map((g) => (g.id === id ? { ...g, ...updates } : g)) : null
    );
  };

  const deleteGroupItem = async (id: string) => {
    await deleteGroup(id);
    setGroups((prev) => (prev ? prev.filter((g) => g.id !== id) : null));
  };

  const value: GroupContextValue = {
    groups,
    loadGroups,
    createGroup,
    editGroup,
    deleteGroupItem,
  };

  return (
    <GroupContext.Provider value={value}>{children}</GroupContext.Provider>
  );
};

export const useGroupContext = () => useContext(GroupContext);
