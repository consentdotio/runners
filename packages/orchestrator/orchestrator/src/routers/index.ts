import { submitRun, getRunStatus, getRunResults } from "./run";

export const router = {
  run: {
    submit: submitRun,
    getStatus: getRunStatus,
    getResults: getRunResults,
  },
};

