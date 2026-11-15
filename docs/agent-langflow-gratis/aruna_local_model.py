"""Small Ollama model for an 8 GB Mac; tool calling, no cloud key."""
from langchain_ollama import ChatOllama
from langflow.custom import Component
from langflow.io import Output, StrInput
from langflow.field_typing import LanguageModel


class ArunaLocalModel(Component):
    display_name = "Aruna Local Model"
    description = "Ollama Qwen3 4B Instruct, 4096 context. Runs entirely on this computer."
    icon = "Cpu"
    name = "ArunaLocalModel"
    inputs = [StrInput(name="model_name", display_name="Ollama model", value="qwen3:4b-instruct-2507-q4_K_M")]
    outputs = [Output(name="model", display_name="Language Model", method="build_model")]

    def build_model(self) -> LanguageModel:
        return ChatOllama(base_url="http://127.0.0.1:11434", model=self.model_name,
                          temperature=0.1, num_ctx=4096, num_predict=800,
                          keep_alive="10m", client_kwargs={"timeout": 180})
