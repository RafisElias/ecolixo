import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import MultiSelect from "./MultiSelect";

const options = [
  { id: 1, name: "Smartphone / Tablet", map_color: "#E53935" },
  { id: 2, name: "Computador / Notebook", map_color: "#8E24AA" },
  { id: 3, name: "TV / Monitor", map_color: "#1E88E5" },
];

describe("MultiSelect", () => {
  it("renderiza placeholder quando nada selecionado", () => {
    render(<MultiSelect options={options} selected={[]} onChange={() => {}} />);
    expect(screen.getByText("Selecione…")).toBeDefined();
  });

  it("exibe opções selecionadas como tags", () => {
    render(<MultiSelect options={options} selected={[1, 3]} onChange={() => {}} />);
    expect(screen.getByText("Smartphone / Tablet")).toBeDefined();
    expect(screen.getByText("TV / Monitor")).toBeDefined();
    expect(screen.queryByText("Computador / Notebook")).toBeNull();
  });

  it("abre dropdown ao clicar no gatilho", async () => {
    const user = userEvent.setup();
    render(<MultiSelect options={options} selected={[]} onChange={() => {}} />);

    expect(screen.queryByRole("option")).toBeNull();

    await user.click(screen.getByRole("combobox"));

    expect(screen.getAllByRole("option")).toHaveLength(3);
  });

  it("seleciona opção ao clicar no dropdown", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MultiSelect options={options} selected={[]} onChange={onChange} />);

    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getAllByRole("option")[2]); // TV / Monitor

    expect(onChange).toHaveBeenCalledWith([3]);
  });

  it("desseleciona opção ao clicar novamente", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MultiSelect options={options} selected={[3]} onChange={onChange} />);

    await user.click(screen.getByRole("combobox"));
    // Opção 3 (TV / Monitor) está selecionada — clicar nela desmarca
    const optionsList = screen.getAllByRole("option");

    // Índice 2 no dropdown = opção "TV / Monitor"
    await user.click(optionsList[2]);

    expect(onChange).toHaveBeenCalledWith([]);
  });
});
