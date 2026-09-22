import assert from "node:assert/strict";
import test from "node:test";
import { getPlayerAction, handlePlayerKeydown } from "../../skills/mechanism-lens/assets/project-template/project/src/lib/player-keyboard.ts";

function keyboardEvent(overrides = {}) {
  return {
    altKey: false,
    ctrlKey: false,
    defaultPrevented: false,
    isComposing: false,
    key: "ArrowRight",
    metaKey: false,
    repeat: false,
    shiftKey: false,
    target: null,
    preventDefault() { this.prevented = true; },
    prevented: false,
    ...overrides,
  };
}

test("maps the existing runtime shortcuts without disabling Shift", () => {
  const cases = [
    ["ArrowRight", "next"],
    [" ", "next"],
    ["ArrowLeft", "previous"],
    ["Home", "home"],
    ["s", "toggle-subtitles"],
    ["S", "toggle-subtitles"],
    ["e", "toggle-evidence"],
    ["E", "toggle-evidence"],
  ];
  for (const [key, action] of cases) assert.equal(getPlayerAction(keyboardEvent({ key, shiftKey: key === key.toUpperCase() })), action);
});

test("ignores prevented, composing, modified, and repeated key events", () => {
  for (const guard of ["defaultPrevented", "isComposing", "altKey", "ctrlKey", "metaKey", "repeat"]) {
    assert.equal(getPlayerAction(keyboardEvent({ [guard]: true })), null, guard);
  }
});

test("ignores shortcuts while the user is editing text", () => {
  const editingTargets = [
    { isContentEditable: true, closest: () => null },
    { isContentEditable: false, closest: (selector) => selector.includes("input") ? { tagName: "INPUT" } : null },
  ];
  for (const target of editingTargets) {
    assert.equal(getPlayerAction(keyboardEvent({ key: "ArrowRight", target })), null);
  }
});

test("keeps arrow navigation global while preserving button and link activation", () => {
  const interactiveTargets = [
    { isContentEditable: false, closest: (selector) => selector === "button, a" ? { tagName: "BUTTON" } : null },
    { isContentEditable: false, closest: (selector) => selector === "button, a" ? { tagName: "A" } : null },
  ];
  for (const target of interactiveTargets) {
    assert.equal(getPlayerAction(keyboardEvent({ key: "ArrowRight", target })), "next");
    assert.equal(getPlayerAction(keyboardEvent({ key: "ArrowLeft", target })), "previous");
    assert.equal(getPlayerAction(keyboardEvent({ key: " ", target })), null);
  }
});

test("prevents default only when a player shortcut is dispatched", () => {
  const actions = [];
  const handled = keyboardEvent({ key: "ArrowLeft" });
  assert.equal(handlePlayerKeydown(handled, (action) => actions.push(action)), true);
  assert.equal(handled.prevented, true);
  assert.deepEqual(actions, ["previous"]);

  const ignored = keyboardEvent({ key: "Escape" });
  assert.equal(handlePlayerKeydown(ignored, (action) => actions.push(action)), false);
  assert.equal(ignored.prevented, false);
  assert.deepEqual(actions, ["previous"]);
});
