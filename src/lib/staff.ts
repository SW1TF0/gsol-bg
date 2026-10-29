import type { Enums } from "./supabase/database.types";

// Роли в админа — общи за сървъра и формите.

export type StaffRole = Enums<"staff_role">;

export const roleLabels: Record<StaffRole, string> = {
  admin: "Администратор",
  manager: "Мениджър",
  sales: "Продажби",
  technician: "Техник",
  editor: "Редактор",
};

export const roleDescriptions: Record<StaffRole, string> = {
  admin: "Всичко, включително настройки и служители",
  manager: "Поръчки, продукти, клиенти, промо кодове, томболи и страници",
  sales: "Поръчки, клиенти и запитвания",
  technician: "Преглед на поръчки и запитвания, бележки",
  editor: "Страници и продукти",
};

export const staffRoles = Object.keys(roleLabels) as StaffRole[];
