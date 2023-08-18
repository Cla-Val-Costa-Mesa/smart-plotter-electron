export interface RawChartPoint {
    id: number;
    timestamp: string;
    prsDeadman: number;
    prsFeedback: number;
  }
  
  export interface ChartPoint {
    id: number;
    timestamp: Date;
    prsDeadman: number;
    prsFeedback: number;
  }
  