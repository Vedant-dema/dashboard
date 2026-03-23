export type DepartmentArea = "sales" | "purchase" | "werkstatt" | "waschanlage";

export const DEPARTMENT_I18N_KEY: Record<DepartmentArea, string> = {
  sales: "deptSales",
  purchase: "deptPurchase",
  werkstatt: "deptWerkstatt",
  waschanlage: "deptWaschanlage",
};
