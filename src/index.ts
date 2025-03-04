#!/usr/bin/env node
import { buildCmd } from "./cli";
const cmd = buildCmd();
cmd.parse();
