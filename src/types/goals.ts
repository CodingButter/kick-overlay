export interface GoalProgress {
  current: number;
  target: number;
}

export interface Goals {
  followers: GoalProgress;
  subscribers: GoalProgress;
}
