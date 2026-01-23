#!/usr/bin/env node

import { buildCmd } from "./cli";
import { logger } from "./logger";

void buildCmd()
  .then((res) => res.parse())
  .catch(logger.error);
