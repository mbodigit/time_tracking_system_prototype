export const TAB_LIST_CLASS = "tabs tabs-box w-fit bg-gray-600 p-1";

export const tabClass = (isActive: boolean) =>
  isActive
    ? "tab !bg-base-100 !text-base-content font-medium"
    : "tab text-white";
