export enum SnapType {
	Day = 'day',
	Hour = 'hour',
	Minute = 'minute',
	Month = 'month',
	Second = 'second',
	Week = 'week',
	Year = 'year',
}

export interface AdjustDateProps {
	date?: Date
	days?: number
	months: number
	snap?: SnapType
}
