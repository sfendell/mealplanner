import prepText from "../../prep.txt?raw";

function parsePrepInstructions(text: string): Record<string, string> {
  const instructions: Record<string, string> = {};

  text.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    const separatorIndex = trimmed.indexOf(":");
    if (separatorIndex === -1) return;

    const key = trimmed.slice(0, separatorIndex).trim().toLowerCase();
    const instruction = trimmed.slice(separatorIndex + 1).trim();
    if (key && instruction) {
      instructions[key] = instruction;
    }
  });

  return instructions;
}

export const prepInstructions: Record<string, string> =
  parsePrepInstructions(prepText);
