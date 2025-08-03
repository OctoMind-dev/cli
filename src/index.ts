#!/usr/bin/env node
import { buildCmd } from "./cli";
buildCmd().then((cmd) => cmd.parse());
