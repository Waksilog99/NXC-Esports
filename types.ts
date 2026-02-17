
export interface TeamStat {
  label: string;
  value: string | number;
  percentage: number;
  color: string;
}

export interface ChartDataPoint {
  date: string;
  winRate: number;
  practiceHours: number;
}

export interface Player {
  id: string;
  name: string;
  role: string;
  image: string;
  stats: {
    kda: string;
    winRate: string;
  };
}
