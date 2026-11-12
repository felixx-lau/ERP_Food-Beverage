import assert from "node:assert/strict";
import { test } from "node:test";
import { extractChatReply } from "../src/lib/chatbot";

const response = (output: unknown) => ({ outputs: [{ outputs: [output] }] });

test("reads the Langflow v1 chat response", () => {
  assert.equal(extractChatReply(response({ results: { message: { text: "Halo!\nAda yang bisa dibantu?" } } })), "Halo!\nAda yang bisa dibantu?");
});

test("supports nested message data and older chat output formats", () => {
  assert.equal(extractChatReply(response({ results: { message: { data: { text: "Jawaban" } } } })), "Jawaban");
  assert.equal(extractChatReply(response({ outputs: { message: { message: "Jawaban lama" } } })), "Jawaban lama");
  assert.equal(extractChatReply(response({ messages: [{ sender: "User", message: "Pertanyaan" }, { sender: "Machine", message: "Jawaban" }] })), "Jawaban");
});

test("ignores inputs, execution metadata and user messages", () => {
  assert.equal(extractChatReply({ inputs: { input_value: "Pertanyaan" }, outputs: [{ inputs: { input_value: "Pertanyaan" }, outputs: [{ results: { debug: { text: "Internal" } }, messages: [{ sender: "User", message: "Pertanyaan" }] }] }] }), null);
});

test("continues past empty component outputs", () => {
  assert.equal(extractChatReply({ outputs: [null, { outputs: [null, { results: { message: { text: "  " } } }, { results: { message: { text: "  Jawaban  " } } }] }] }), "Jawaban");
});

test("rejects malformed and non-text outputs", () => {
  for (const payload of [null, "oops", [], {}, { outputs: {} }, response({ results: { message: { text: { secret: "metadata" } } } })]) {
    assert.equal(extractChatReply(payload), null);
  }
});
