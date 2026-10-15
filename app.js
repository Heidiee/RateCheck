const API = "https://api.frankfurter.dev/v2";
const fromCurrency = document.querySelector("#fromCurrency");
const toCurrency = document.querySelector("#toCurrency");
const fromAmount = document.querySelector("#fromAmount");
const toAmount = document.querySelector("#toAmount");
const fromFlag = document.querySelector("#fromFlag");
const toFlag = document.querySelector("#toFlag");
const goal = document.querySelector("#goalSelect");
const fromSymbol = document.querySelector("#fromSymbol");
const toSymbol = document.querySelector("#toSymbol");
const status = document.querySelector("#status");
const meter = document.querySelector("#meter");
const recommendation = document.querySelector("#recommendation");
const gauge = document.querySelector("#gauge");
const bannerMessage = document.querySelector("#bannerMessage");
const moodIcons = [...document.querySelectorAll("#moodScale img")];
let goalMode = "sell";
let moodTransitionId = 0;
const moodIconSources = {
    "strongly-unfavorable": {
        active: "assets/mood-strongly-unfavorable-active.svg",
        disabled: "assets/mood-strongly-unfavorable-disabled.svg"
    },
    unfavorable: {
        active: "assets/mood-unfavorable-active.svg",
        disabled: "assets/mood-unfavorable-disabled.svg"
    },
    typical: {
        active: "assets/mood-typical-active.svg",
        disabled: "assets/mood-typical-disabled.svg"
    },
    favorable: {
        active: "assets/mood-favorable-active.svg",
        disabled: "assets/mood-favorable-disabled.svg"
    },
    "strongly-favorable": {
        active: "assets/mood-strongly-favorable-active.svg",
        disabled: "assets/mood-strongly-favorable-disabled.svg"
    }
};
const currencySymbols = { AED: "د.إ", AUD: "$", CAD: "$", CHF: "CHF", CNY: "¥", CZK: "Kč", DKK: "kr", EUR: "€", GBP: "£", HKD: "$", HUF: "Ft", IDR: "Rp", INR: "₹", JPY: "¥", KRW: "₩", MXN: "$", MYR: "RM", NOK: "kr", NZD: "$", PHP: "₱", PLN: "zł", SEK: "kr", SGD: "$", THB: "฿", TRY: "₺", USD: "$", ZAR: "R" };
const format = new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 });
const amountFormat = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const numberParts = amountFormat.formatToParts(1234.5);
const groupSeparator = numberParts.find(part => part.type === "group")?.value || ",";
const decimalSeparator = numberParts.find(part => part.type === "decimal")?.value || ".";
const percent = value => `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
const dateOnly = date => date.toISOString().slice(0, 10);
const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;
const standardDeviation = values => {
    const average = mean(values);
    return Math.sqrt(mean(values.map(value => (value - average) ** 2)));
};

function getRating(score) {
    if (score >= 80 && score <= 100) return ["strongly-favorable", "Strongly favorable"];
    if (score >= 60) return ["favorable", "Favorable"];
    if (score >= 40) return ["typical", "Typical"];
    if (score >= 20) return ["unfavorable", "Unfavorable"];
    return ["strongly-unfavorable", "Strongly unfavorable"];
}

function createGaugeBars() {
    const colors = ["#ff3938", "#ff4d38", "#ff7b3b", "#ff9e3e", "#ffb23e", "#ffd45b", "#ffe75c", "#c8e46c", "#a8df71", "#83d869", "#57d162"];
    const count = 21;
    for (let index = 0; index < count; index += 1) {
        const angle = -90 + (index / (count - 1)) * 180;
        const color = colors[Math.round((index / (count - 1)) * (colors.length - 1))];
        const track = document.createElement("span");
        track.className = "gauge-bar track";
        track.style.setProperty("--angle", `${angle}deg`);
        gauge.appendChild(track);
        const bar = document.createElement("span");
        bar.className = "gauge-bar data-bar";
        bar.style.setProperty("--angle", `${angle}deg`);
        bar.style.background = color;
        bar.dataset.index = index;
        gauge.appendChild(bar);
    }
}

function updateRecommendation(score, period) {
    const [state, label] = getRating(score);
    const action = goalMode === "buy" ? "buying" : "selling";
    const copy = {
        "strongly-favorable": `Among the best rates of the last ${period} days for ${action}.`,
        favorable: `Better than usual for ${action}.`,
        typical: "About average for the period. Timing matters little.",
        unfavorable: `Worse than usual for ${action}.`,
        "strongly-unfavorable": `Among the weakest rates of the last ${period} days for ${action}.`
    };
    const moodCopy = {
        "strongly-unfavorable": "Its a very bad day,",
        unfavorable: "Its a bad day",
        typical: "Its a neutral day",
        favorable: "Its a good day",
        "strongly-favorable": "Its a great day!"
    };
    meter.dataset.state = state;
    const bars = [...gauge.querySelectorAll(".data-bar")];
    const activeBars = Math.round((score / 100) * bars.length);
    bars.forEach((bar, index) => {
        bar.classList.toggle("is-visible", index < activeBars);
        bar.style.transitionDelay = index < activeBars ? `${index * 35}ms` : `${(bars.length - index) * 20}ms`;
    });
    recommendation.textContent = `${label}: ${copy[state]}`;
    bannerMessage.textContent = moodCopy[state];
    bannerMessage.dataset.state = state;
    const transitionId = ++moodTransitionId;
    moodIcons.forEach(icon => {
        const isActive = icon.dataset.state === state;
        const source = moodIconSources[icon.dataset.state][isActive ? "active" : "disabled"];
        if (icon.src.endsWith(source)) {
            icon.classList.toggle("is-active", isActive);
            return;
        }
        icon.classList.add("is-changing");
        window.setTimeout(() => {
            if (transitionId !== moodTransitionId) return;
            icon.src = source;
            icon.classList.toggle("is-active", isActive);
            window.requestAnimationFrame(() => icon.classList.remove("is-changing"));
        }, 140);
    });
}

function setStatus(message, isError = false) {
    status.textContent = message;
    status.classList.toggle("error", isError);
}

function setFlag(select, image) {
    image.src = `https://flagcdn.com/w40/${select.value.toLowerCase().slice(0, 2)}.png`;
    image.alt = `${select.value} flag`;
}

function renderCombobox(select) {
    const combobox = select.closest(".currency-combobox");
    const value = combobox.querySelector(".combobox-value");
    const list = combobox.querySelector(".combobox-options");
    const query = combobox.querySelector(".combobox-search").value.trim().toLowerCase();
    const options = [...select.options].filter(option => option.textContent.toLowerCase().includes(query));
    value.textContent = select.value || "—";
    list.innerHTML = options.length
        ? options.map(option => `<li class="combobox-option" role="option" tabindex="-1" data-value="${option.value}" aria-selected="${option.value === select.value}">${option.textContent}</li>`).join("")
        : `<li class="combobox-empty">No currencies found</li>`;
}

function closeCombobox(combobox) {
    combobox.classList.remove("is-open");
    const trigger = combobox.querySelector(".combobox-trigger");
    trigger.setAttribute("aria-expanded", "false");
}

function setupCombobox(select) {
    const combobox = select.closest(".currency-combobox");
    const trigger = combobox.querySelector(".combobox-trigger");
    const search = combobox.querySelector(".combobox-search");
    const list = combobox.querySelector(".combobox-options");
    trigger.addEventListener("click", () => {
        const isOpen = combobox.classList.toggle("is-open");
        trigger.setAttribute("aria-expanded", String(isOpen));
        if (isOpen) {
            renderCombobox(select);
            search.value = "";
            search.focus();
        }
    });
    search.addEventListener("input", () => renderCombobox(select));
    list.addEventListener("click", event => {
        const option = event.target.closest(".combobox-option");
        if (!option) return;
        select.value = option.dataset.value;
        select.dispatchEvent(new Event("change", { bubbles: true }));
        closeCombobox(combobox);
        trigger.focus();
    });
    search.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeCombobox(combobox);
            trigger.focus();
        }
    });
}

function updateComboboxes() {
    document.querySelectorAll(".currency-combobox select").forEach(select => renderCombobox(select));
}

function updateSymbols() {
    fromSymbol.textContent = currencySymbols[fromCurrency.value] || fromCurrency.value;
    toSymbol.textContent = currencySymbols[toCurrency.value] || toCurrency.value;
}

function populateCurrencies(currencies) {
    const options = currencies
        .sort((a, b) => a.iso_code.localeCompare(b.iso_code))
        .map(currency => `<option value="${currency.iso_code}">${currency.iso_code}</option>`)
        .join("");
    fromCurrency.innerHTML = options;
    toCurrency.innerHTML = options;
    fromCurrency.value = currencies.some(item => item.iso_code === "IDR") ? "IDR" : currencies[0].iso_code;
    toCurrency.value = currencies.some(item => item.iso_code === "AUD")
        ? "AUD"
        : currencies.find(item => item.iso_code !== fromCurrency.value)?.iso_code || fromCurrency.value;
    fromAmount.value = amountFormat.format(1000);
    setFlag(fromCurrency, fromFlag);
    setFlag(toCurrency, toFlag);
    updateSymbols();
    updateComboboxes();
}

async function loadCurrencies() {
    const response = await fetch(`${API}/currencies`);
    if (!response.ok) throw new Error("Currency list request failed");
    const currencies = await response.json();
    populateCurrencies(currencies);
}

async function loadRate(from, to) {
    const response = await fetch(`${API}/rate/${from}/${to}`);
    if (!response.ok) throw new Error("Rate request failed");
    const data = await response.json();
    return data.rate;
}

async function loadHistory(from, to) {
    const end = new Date();
    const start = new Date(end);
    start.setFullYear(start.getFullYear() - 1);
    const response = await fetch(`${API}/rates?base=${from}&quotes=${to}&from=${dateOnly(start)}&to=${dateOnly(end)}`);
    if (!response.ok) throw new Error("Historical rate request failed");
    const data = await response.json();
    return data
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(rate => rate.rate)
        .filter(Number.isFinite)
        .slice(-356);
}

async function refreshRate() {
    const from = fromCurrency.value;
    const to = toCurrency.value;
    const amountText = fromAmount.value.trim().split(groupSeparator).join("").replace(decimalSeparator, ".");
    const amount = Number(amountText);
    if (!from || !to || from === to) {
        setStatus("Choose two different currencies.", true);
        return;
    }
    if (!Number.isFinite(amount) || amount < 0) {
        setStatus("Enter a valid amount.", true);
        return;
    }
    setStatus("Loading live and historical rates…");
    try {
        const [today, values] = await Promise.all([loadRate(from, to), loadHistory(from, to)]);
        if (!values.length) throw new Error("No historical data available");
        const last30 = values.slice(-30);
        const average30 = mean(last30);
        const average365 = mean(values);
        const roc30 = ((today - average30) / average30) * 100;
        const roc365 = ((today - average365) / average365) * 100;
        const z = (today - average30) / (standardDeviation(last30) || 1);
        const percentile = last30.filter(value => value <= today).length / last30.length;
        const score = Math.max(0, Math.min(100, Math.round(goalMode === "buy" ? (1 - percentile) * 100 : percentile * 100)));
        document.querySelector("#rateValue").textContent = format.format(today);
        toAmount.value = amountFormat.format(amount * today);
        document.querySelector("#score").textContent = score;
        updateRecommendation(score, last30.length);
        document.querySelector("#roc30").textContent = `↗ ${percent(roc30)}`;
        document.querySelector("#roc365").textContent = `↘ ${percent(roc365)}`;
        setStatus(`Based on ${last30.length} days. Z-score: ${z.toFixed(2)}.`);
    } catch (error) {
        console.error("Frankfurter error:", error);
        setStatus(`Unable to load rates: ${error.message}`, true);
    }
}

document.querySelector("#dateLabel").textContent = new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(new Date());
[fromCurrency, toCurrency].forEach(control => control.addEventListener("change", () => {
    setFlag(control, control === fromCurrency ? fromFlag : toFlag);
    updateSymbols();
    updateComboboxes();
    refreshRate();
}));
fromAmount.addEventListener("input", refreshRate);
document.querySelector(".swap").addEventListener("click", () => {
    const currentFrom = fromCurrency.value;
    fromCurrency.value = toCurrency.value;
    toCurrency.value = currentFrom;
    setFlag(fromCurrency, fromFlag);
    setFlag(toCurrency, toFlag);
    updateSymbols();
    updateComboboxes();
    refreshRate();
});
document.querySelectorAll(".currency-combobox select").forEach(setupCombobox);
document.addEventListener("click", event => {
    document.querySelectorAll(".currency-combobox.is-open").forEach(combobox => {
        if (!combobox.contains(event.target)) closeCombobox(combobox);
    });
});
const goalCombobox = document.querySelector(".goal-combobox");
const goalTrigger = goalCombobox.querySelector(".goal-trigger");
const goalValue = goalCombobox.querySelector(".goal-value");
const goalOptions = [...goalCombobox.querySelectorAll("[role='option']")];
function closeGoalCombobox() {
    goalCombobox.classList.remove("is-open");
    goalTrigger.setAttribute("aria-expanded", "false");
}
goalTrigger.addEventListener("click", () => {
    const isOpen = goalCombobox.classList.toggle("is-open");
    goalTrigger.setAttribute("aria-expanded", String(isOpen));
});
goalOptions.forEach(option => option.addEventListener("click", () => {
    goal.value = option.dataset.value;
    goalMode = goal.value;
    goalValue.textContent = goal.value;
    updateSymbols();
    goalOptions.forEach(item => item.setAttribute("aria-selected", String(item === option)));
    closeGoalCombobox();
    goalTrigger.focus();
    refreshRate();
}));
document.addEventListener("click", event => {
    if (!goalCombobox.contains(event.target)) closeGoalCombobox();
});
goal.addEventListener("change", () => {
    goalMode = goal.value;
    goalValue.textContent = goal.value;
    updateSymbols();
    refreshRate();
});

createGaugeBars();

(async function init() {
    try {
        await loadCurrencies();
        await refreshRate();
    } catch (error) {
        setStatus("Unable to load currencies. Check your connection and try again.", true);
    }
})();
