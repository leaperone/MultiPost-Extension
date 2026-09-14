import { createdInputs } from "../helper";
import { waitForElement } from "./common";

let suppressFilePicker = false;

export function prepareJianpianInput(input: HTMLInputElement): void {
  if (location.hostname !== "www.jianpian.cn" || !location.pathname.startsWith("/p/edit")) return;
  const originalClick = input.click.bind(input);
  input.click = () => {
    if (!suppressFilePicker) originalClick();
  };
}

export async function handleJianpianUpload(event: MessageEvent): Promise<void> {
  if (event.source !== window || location.hostname !== "www.jianpian.cn") return;
  const files = Array.isArray(event.data.files)
    ? event.data.files.filter((file: unknown): file is File => file instanceof File)
    : [];
  if (files.length === 0) return;

  const importWord = await waitForElement('p[name="导入Word文档"]');
  if (!(importWord instanceof HTMLElement)) return;
  importWord.click();

  const chooseDocument = await waitForElement('button[name="选择文档"]');
  if (!(chooseDocument instanceof HTMLElement)) return;

  suppressFilePicker = true;
  chooseDocument.dispatchEvent(new Event("click", { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 500));
  suppressFilePicker = false;

  const input = [...createdInputs].reverse().find((candidate) => candidate.type === "file");
  if (!input) return;

  const transfer = new DataTransfer();
  files.forEach((file) => transfer.items.add(file));
  input.files = transfer.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));

  for (let attempt = 0; attempt < 10; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const continueButton = document.querySelector('button[name="继续导入Word"]');
    if (continueButton instanceof HTMLElement) {
      continueButton.click();
      return;
    }
  }
}
