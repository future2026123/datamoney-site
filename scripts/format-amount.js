(() => {
  function normalize(value) {
    const cleaned = value.replace(/[^0-9.\-]/g, "");
    const sign = cleaned.startsWith("-") ? "-" : "";
    const unsigned = cleaned.replace(/-/g, "");
    const dot = unsigned.indexOf(".");
    return sign + (dot < 0 ? unsigned : unsigned.slice(0, dot) + "." + unsigned.slice(dot + 1).replace(/\./g, ""));
  }

  function format(value) {
    const normalized = normalize(value);
    const sign = normalized.startsWith("-") ? "-" : "";
    const unsigned = sign ? normalized.slice(1) : normalized;
    const dot = unsigned.indexOf(".");
    const integer = dot < 0 ? unsigned : unsigned.slice(0, dot);
    const fraction = dot < 0 ? "" : unsigned.slice(dot);
    return sign + integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + fraction;
  }

  function positionFor(value, characters) {
    if (!characters) return 0;
    let seen = 0;
    for (let i = 0; i < value.length; i++) {
      if (value[i] !== ",") seen++;
      if (seen === characters) return i + 1;
    }
    return value.length;
  }

  function formatInput(input) {
    const value = input.value;
    const start = input.selectionStart ?? value.length;
    const end = input.selectionEnd ?? start;
    const startChars = normalize(value.slice(0, start)).length;
    const endChars = normalize(value.slice(0, end)).length;
    const formatted = format(value);
    if (formatted === value) return;
    input.value = formatted;
    if (document.activeElement === input) {
      input.setSelectionRange(positionFor(formatted, startChars), positionFor(formatted, endChars));
    }
  }

  document.querySelectorAll("input[data-amount]").forEach(input => {
    formatInput(input);
    input.addEventListener("input", event => {
      if (!event.isComposing) formatInput(input);
    });
    input.addEventListener("compositionend", () => formatInput(input));
    input.addEventListener("keydown", event => {
      const start = input.selectionStart;
      if (start === null || start !== input.selectionEnd) return;
      const value = input.value;
      if (event.key === "Backspace" && value[start - 1] === "," && /\d/.test(value[start - 2] || "")) {
        event.preventDefault();
        input.value = value.slice(0, start - 2) + value.slice(start);
        input.setSelectionRange(start - 2, start - 2);
        input.dispatchEvent(new Event("input", { bubbles: true }));
      } else if (event.key === "Delete" && value[start] === "," && /\d/.test(value[start + 1] || "")) {
        event.preventDefault();
        input.value = value.slice(0, start) + value.slice(start + 2);
        input.setSelectionRange(start, start);
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
  });
})();
