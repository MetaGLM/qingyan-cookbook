import ISport from "./ISport.ts";

export interface ISchedule {
    units: {
        unitCode: string;
        description: string;
        match: Record<string, { teamCode: string, description: string }>;
        start: string;
        startDateTimeUtc: string;
        localStartDateTime: string;
        end: string;
        endDateTimeUtc: string;
        localEndDateTime: string;
        estimated: boolean;
        estimatedStart: boolean;
        startText: string;
        medal: string;
    }[],
    sport: ISport;
    venue: {
        code: string;
        name: string;
    }
}

export default interface ISchedules {
    /** 奥运会排期 */
    days: string[];
    /** 奥运会的运动列表 */
    sports: ISport[];
    /** 奥运会的赛程列表 */
    schedules: Record<string, ISchedule>;
    /** 赛程注意事项 */
    disclaimerText: string;
}