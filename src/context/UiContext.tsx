import React, { createContext, useContext, useMemo, useState } from "react";

export interface UiState {
  selectedPuppet: SVGGElement | null;
  setSelectedPuppet: (g: SVGGElement | null) => void;

  limbIds: string[];
  setLimbIds: (ids: string[]) => void;

  selectedLimb: string;
  setSelectedLimb: (id: string) => void;

  angle: number;
  setAngle: (deg: number) => void;

  playing: boolean;
  setPlaying: (v: boolean) => void;
}

const Ctx = createContext<UiState | null>(null);

export const UiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedPuppet, setSelectedPuppet] = useState<SVGGElement | null>(null);
  const [limbIds, setLimbIds] = useState<string[]>([]);
  const [selectedLimb, setSelectedLimb] = useState<string>("");
  const [angle, setAngle] = useState<number>(0);
  const [playing, setPlaying] = useState<boolean>(false);

  const value = useMemo(
    () => ({
      selectedPuppet,
      setSelectedPuppet,
      limbIds,
      setLimbIds,
      selectedLimb,
      setSelectedLimb,
      angle,
      setAngle,
      playing,
      setPlaying,
    }),
    [selectedPuppet, limbIds, selectedLimb, angle, playing],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useUi = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useUi must be used within UiProvider");
  return ctx;
};

