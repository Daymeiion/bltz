import { expect, it } from "vitest";
import { formatHometown } from "@/lib/player/locker-format";

it.each([
  ["Long Beach, California", "Long Beach, CA"],
  ["STOCKTON, CALIFORNIA", "STOCKTON, CA"],
  ["Lake Mary, FL", "Lake Mary, FL"],
  ["New York, New York", "New York, NY"],
  ["Charleston, West Virginia", "Charleston, WV"],
  ["Washington, District of Columbia", "Washington, DC"],
  ["Honolulu, Hawaii, United States", "Honolulu, HI, United States"],
  ["Paris, France", "Paris, France"],
  ["Toronto, Ontario, Canada", "Toronto, Ontario, Canada"],
  ["California City", "California City"],
  ["California", "California"],
  ["", ""],
  [null, ""],
])("formats the state in %s without rewriting the city", (input, expected) => {
  expect(formatHometown(input)).toBe(expected);
});
