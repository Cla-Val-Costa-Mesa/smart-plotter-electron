import React, { PureComponent } from "react";
import type { ChartPointString, ChartPointDate } from "../types";
import {
  scaleTime,
  type ScaleTime,
  scaleLinear,
  type ScaleLinear,
} from "d3-scale";
import { timeFormat } from "d3-time-format";
import {
  timeDay,
  timeHour,
  timeMinute,
  timeMonth,
  timeSecond,
  timeWeek,
  timeYear,
} from "d3-time";
import { DateTime } from "luxon";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceArea,
} from "recharts";
import type { CategoricalChartState } from "recharts/types/chart/generateCategoricalChart";

// LogPlotProps are the props passed to the LogPlot.
interface LogPlotProps {
  plotData: ChartPointString[];
  onReset: () => void;
}

// LogPlotState holds the entire state of the LogPlot.
interface LogPlotState {
  data: ChartPointDate[]; // the plotted data
  timescale: ScaleTime<number, number, never>; // x-axis scale
  datascale: ScaleLinear<number, number, never>; // y-axis scale
  idLeft: number | null; // id of selected point
  idRight: number | null; // id of selected point
  xLeft: number | null; // x-axis value of selected point
  xRight: number | null; // x-axis value of selected point
}

// Payload contains the important information in an ActivePayloadItem.
interface Payload {
  id: number;
  timestamp: number;
  prsDeadman: number;
  prsFeedback: number;
}

// Clicking/hovering on the chart gives you an ActivePayloadItem.
interface ActivePayloadItem {
  payload: Payload;
}

// Helper for formatting the timescale.
const formatMillisecond = timeFormat(".%L"),
  formatSecond = timeFormat(":%S"),
  formatMinute = timeFormat("%I:%M"),
  formatHour = timeFormat("%I %p"),
  formatDay = timeFormat("%a %d"),
  formatWeek = timeFormat("%b %d"),
  formatMonth = timeFormat("%B"),
  formatYear = timeFormat("%Y");
function multiFormat(date: Date): string {
  return (
    timeSecond(date) < date
      ? formatMillisecond
      : timeMinute(date) < date
      ? formatSecond
      : timeHour(date) < date
      ? formatMinute
      : timeDay(date) < date
      ? formatHour
      : timeMonth(date) < date
      ? timeWeek(date) < date
        ? formatDay
        : formatWeek
      : timeYear(date) < date
      ? formatMonth
      : formatYear
  )(date);
}

// Create timescale from RawChartPoints.
function createTimescale(
  points: ChartPointString[]
): ScaleTime<number, number, never> {
  // Get the first and last timestamps.
  let timeStrLeft = points[0]?.timestamp;
  let timeStrRight = points[points.length - 1]?.timestamp;

  // If the timestamps exist,
  if (timeStrLeft && timeStrRight) {
    // Ensure that the earlier time is in timeStrLeft.
    if (timeStrLeft > timeStrRight) {
      [timeStrLeft, timeStrRight] = [timeStrRight, timeStrLeft];
    }

    // Convert the timestamps to numbers (epoch time).
    const timeLeft = DateTime.fromISO(timeStrLeft).valueOf();
    const timeRight = DateTime.fromISO(timeStrRight).valueOf();

    // Return the timescale.
    return scaleTime().domain([timeLeft, timeRight]).nice();
  } else {
    // Else return a dummy timescale.
    return scaleTime().domain([0, 0]);
  }
}

// Get min/max pressure values from RawChartPoints or ChartPoints.
function getMinMaxPressure(
  points: ChartPointString[] | ChartPointDate[]
): number[] {
  // Start with both values set to zero.
  let [min, max] = [0, 0];

  // For each p in points,
  points.forEach((p) => {
    // Record over min and max as needed.
    if (p.prsDeadman > max) max = p.prsDeadman;
    if (p.prsFeedback > max) max = p.prsFeedback;
    if (p.prsDeadman < min) min = p.prsDeadman;
    if (p.prsFeedback < min) min = p.prsFeedback;
  });

  // Always show the x-axis (y = 0).
  if (min > 0) min = 0;

  return [min, max];
}

// Create datascale from RawChartPoints or ChartPoints.
function createDatascale(
  points: ChartPointDate[] | ChartPointDate[]
): ScaleLinear<number, number, never> {
  // Create ScaleLinear using domain from getMinMaxPressure.
  // nice() rounds the domain to nice values.
  return scaleLinear().domain(getMinMaxPressure(points)).nice();
}

// Formatting for the Tooltip.
type TooltipProps = {
  active?: boolean;
  payload?: ActivePayloadItem;
  label?: string;
};
const CustomTooltip: React.FC<TooltipProps> = ({ active, payload }) => {
  if (active && payload) {
    const timestamp = payload[0].payload.timestamp;
    const prsDeadman = payload[0].payload.prsDeadman;
    const prsFeedback = payload[0].payload.prsFeedback;

    return (
      <div className="custom-tooltip rounded-lg py-2 px-4 bg-[#121212] text-[#ffffffde]">
        <p className="label">{timestamp.toString()}</p>
        <p className="prsDeadman">Deadman: {prsDeadman.toFixed(2)} psig</p>
        <p className="prsFeedback">Feedback: {prsFeedback.toFixed(2)} psig</p>
      </div>
    );
  }

  return null;
};

// Reduce the number of points in the given array.
const numVisiblePoints = 1000;
function shrinkDataset(points: ChartPointString[]): ChartPointString[] {
  // Make a copy of points;
  let newPoints = points.slice();

  //console.log("Beginning shrinkDataset(): " + newPoints.length);

  // While size is larger than numVisiblePoints,
  while (points.length > numVisiblePoints) {
    // Calculate the step size.
    const step = Math.floor(newPoints.length / numVisiblePoints);

    // If step is 1 then stop.
    if (step === 1) break;

    // Filter out points.
    newPoints = newPoints.filter((value, index) => {
      return index % step === 0;
    });
  }

  //console.log("Finished shrinkDataset(): " + newPoints.length);
  return newPoints;
}

// Initial state of the LogPlot is used in zoomOut() and is never updated.
let initialState: LogPlotState;

// Create class LogPlot.
export default class LogPlot extends PureComponent<LogPlotProps, LogPlotState> {
  // constructor() sets up the initialState.
  constructor(props: LogPlotProps) {
    super(props);

    // Shrink the original dataset.
    const rawPoints = shrinkDataset(this.props.plotData);

    // Create a ScaleTime object for x-axis formatting.
    const initialTimescale = createTimescale(rawPoints);

    // Convert the timestamps from strings to Dates.
    const plotData: ChartPointDate[] = rawPoints.map((point) => ({
      ...point,
      timestamp: new Date(point.timestamp),
    }));

    // Create a ScaleLinear object for y-axis formatting.
    const initialDatascale = createDatascale(plotData);

    // Create the initialState.
    initialState = {
      data: plotData,
      timescale: initialTimescale,
      datascale: initialDatascale,
      idLeft: null,
      idRight: null,
      xLeft: null,
      xRight: null,
    };

    // Set the initialState.
    this.state = initialState;
  }

  // zoom() is called after the user highlights a section of the LogPlot.
  zoom() {
    let { idLeft, idRight } = this.state;

    // If idLeft or idRight are null or equal,
    if (idLeft === null || idRight === null || idLeft === idRight) {
      // Reset their values in state and return.
      this.setState(() => ({
        ...this.state,
        idLeft: null,
        idRight: null,
      }));
      return;
    }

    // If idLeft is greater than idRight, swap their values.
    if (idLeft > idRight) [idLeft, idRight] = [idRight, idLeft];

    // Slice the *original* dataset using idLeft and idRight.
    let rawPoints: ChartPointString[] = this.props.plotData.slice(
      idLeft,
      idRight
    );

    // Shrink the dataset.
    rawPoints = shrinkDataset(rawPoints);

    // Create new timescale from rawPoints.
    const newTimescale = createTimescale(rawPoints);

    // Convert RawChartPoints to ChartPoints.
    const points: ChartPointDate[] = rawPoints.map((p) => ({
      ...p,
      timestamp: new Date(p.timestamp),
    }));

    // Create new datascale from points.
    const newDatascale = createDatascale(points);

    // Create the new state.
    const newLogPlotState: LogPlotState = {
      data: points,
      timescale: newTimescale,
      datascale: newDatascale,
      idLeft: null,
      idRight: null,
      xLeft: null,
      xRight: null,
    };

    // Set the new state.
    this.setState(newLogPlotState);
  }

  // zoomOut() resets the state to initialState.
  zoomOut() {
    this.setState(initialState);
  }

  render() {
    const { data, xLeft, xRight } = this.state;

    return (
      <div
        className="highlight-bar-charts mx-6 py-2 px-4 flex-col rounded-lg bg-[#ffffff12]"
        style={{ height: `calc(100vh - 188px)`, userSelect: "none" }}
      >
        <ResponsiveContainer>
          <ComposedChart
            data={data}
            margin={{
              top: 20,
              right: 30,
              bottom: 40,
              left: 15,
            }}
            onMouseDown={(e: CategoricalChartState) => {
              let id: number | null = null;
              let timestamp: number | null = null;
              const payload = e?.activePayload as ActivePayloadItem[];

              if (payload?.[0]) {
                id = payload[0].payload.id;
                timestamp = payload[0].payload.timestamp.valueOf();
              }

              this.setState({
                ...this.state,
                idLeft: id,
                xLeft: timestamp,
              });
            }}
            onMouseMove={(e: CategoricalChartState) => {
              let id: number | null = null;
              let timestamp: number | null = null;
              const payload = e.activePayload as ActivePayloadItem[];

              if (payload?.[0]) {
                id = payload[0].payload.id;
                timestamp = payload[0].payload.timestamp.valueOf();
              }

              this.state.idLeft !== null &&
                this.setState({
                  ...this.state,
                  idRight: id,
                  xRight: timestamp,
                });
            }}
            onMouseUp={this.zoom.bind(this)}
          >
            <XAxis
              allowDataOverflow
              dataKey="timestamp"
              interval={0}
              ticks={this.state.timescale
                .ticks(10)
                .map((date) => date.valueOf())}
              tickFormatter={multiFormat}
              angle={0}
              domain={this.state.timescale
                .domain()
                .map((date) => date.valueOf())}
              scale={this.state.timescale}
              type="number"
              label={{
                value: "Time",
                position: "bottom",
                offset: "20",
                fill: "#ffffffde",
              }}
              stroke="#ffffffde"
              dy={15}
            />
            <YAxis
              allowDataOverflow
              dataKey="prsFeedback"
              ticks={this.state.datascale.ticks(10).map((data) => data)}
              domain={this.state.datascale.domain().map((data) => data)}
              scale={this.state.datascale}
              label={{
                value: "Pressure (PSIG)",
                position: "left",
                offset: "3",
                angle: "270",
                fill: "#ffffffde",
                style: { textAnchor: "middle" },
              }}
              stroke="#ffffffde"
              dx={-7}
            />
            <Line
              type="monotone"
              dataKey="prsDeadman"
              stroke="#3182bd"
              name="Deadman"
              animationDuration={200}
            />
            <Line
              type="monotone"
              dataKey="prsFeedback"
              stroke="#db654d"
              name="Feedback"
              animationDuration={200}
            />
            {xLeft && xRight ? (
              <ReferenceArea
                x1={xLeft}
                x2={xRight}
                fillOpacity={0.2}
                strokeOpacity={0.3}
              />
            ) : null}
            <CartesianGrid stroke="#ffffff99" strokeDasharray="3 3" />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ bottom: 0, left: 42 }} />
          </ComposedChart>
        </ResponsiveContainer>
        <div className="m-8 flex flex-row justify-center gap-6">
          <button
            type="button"
            className="rounded border border-gray-400 bg-[#ffffff12] px-4 py-2 font-semibold text-[#ffffffde] shadow hover:bg-[#ffffff30]"
            onClick={this.props.onReset}
          >
            Upload New Log
          </button>
          <button
            type="button"
            className="rounded border border-gray-400 bg-[#ffffff12] px-4 py-2 font-semibold text-[#ffffffde] shadow hover:bg-[#ffffff30]"
            onClick={this.zoomOut.bind(this)}
          >
            Reset Zoom
          </button>
        </div>
      </div>
    );
  }
}
