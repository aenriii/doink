import { channel } from "./util";
import { test, expect } from 'bun:test';

test("Channel works correctly", async () => {
    let [ts, tc] = channel<string>();

    ts("Hello World!");

    expect(await tc()).toBe("Hello World!");
})