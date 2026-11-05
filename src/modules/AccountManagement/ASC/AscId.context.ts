import React, { createContext, useContext } from "react";

const AscIdContext = createContext<string | undefined>(undefined);

export const AscIdProvider: React.FC<{ value: string | undefined; children: React.ReactNode }> = ({
  value,
  children,
}) => {
  return React.createElement(AscIdContext.Provider, { value }, children);
};

export const useAscId = () => {
  const context = useContext(AscIdContext);
  return context;
};
