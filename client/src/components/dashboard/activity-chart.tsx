import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Sample data for the activity chart
const dailyData = [
  { name: "Mon", access: 12 },
  { name: "Tue", access: 19 },
  { name: "Wed", access: 15 },
  { name: "Thu", access: 21 },
  { name: "Fri", access: 16 },
  { name: "Sat", access: 8 },
  { name: "Sun", access: 5 },
];

const weeklyData = [
  { name: "Week 1", access: 65 },
  { name: "Week 2", access: 59 },
  { name: "Week 3", access: 80 },
  { name: "Week 4", access: 71 },
];

const monthlyData = [
  { name: "Jan", access: 120 },
  { name: "Feb", access: 140 },
  { name: "Mar", access: 190 },
  { name: "Apr", access: 170 },
  { name: "May", access: 190 },
  { name: "Jun", access: 230 },
];

type TimeRange = "day" | "week" | "month";

export default function ActivityChart() {
  const [timeRange, setTimeRange] = useState<TimeRange>("week");

  const getDataByTimeRange = () => {
    switch (timeRange) {
      case "day":
        return dailyData;
      case "week":
        return weeklyData;
      case "month":
        return monthlyData;
      default:
        return weeklyData;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold text-neutral-800">Access Activity</CardTitle>
        <div className="flex space-x-2">
          <Button
            variant={timeRange === "day" ? "default" : "outline"}
            size="sm"
            className="text-xs"
            onClick={() => setTimeRange("day")}
          >
            Day
          </Button>
          <Button
            variant={timeRange === "week" ? "default" : "outline"}
            size="sm"
            className="text-xs"
            onClick={() => setTimeRange("week")}
          >
            Week
          </Button>
          <Button
            variant={timeRange === "month" ? "default" : "outline"}
            size="sm"
            className="text-xs"
            onClick={() => setTimeRange("month")}
          >
            Month
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={getDataByTimeRange()} margin={{ top: 20, right: 15, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }} 
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis 
                tick={{ fontSize: 12 }} 
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
                tickFormatter={(value) => `${value}`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}
                formatter={(value) => [`${value} accesses`, 'Count']}
              />
              <Bar 
                dataKey="access" 
                fill="hsl(var(--primary))" 
                radius={[4, 4, 0, 0]}
                barSize={timeRange === "month" ? 15 : 30}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
