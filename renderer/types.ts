import { DateTime } from "luxon";

export interface ChartPointString {
  id: number;
  timestamp: string;
  prsDeadman: number;
  prsFeedback: number;
}

export interface ChartPointDate {
  id: number;
  timestamp: Date;
  prsDeadman: number;
  prsFeedback: number;
}

export interface SQLiteRow {
  DateTimeEpochMS: number;
  AI1Eng: number;
  AI2Eng: number;
}