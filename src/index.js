import "./styles.css";

const API_BASE = "https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline";

const form = document.querySelector("#search-form");
const locationInput = document.querySelector("#location-input");
const searchButton = document.querySelector("#search-button");
const statusMessage = document.querySelector("#status-message");
const weatherPanel = document.querySelector("#weather-panel");
const celsiusButton = document.querySelector("#celsius-btn");
const fahrenheitButton = document.querySelector("#fahrenheit-btn");

let currentWeather = null;
let temperatureUnit = "C";

function getWeatherIcon(icon) {
  const icons = {
    "clear-day": "☀️",
    "clear-night": "🌙",
    "partly-cloudy-day": "🌤️",
    "partly-cloudy-night": "☁️",
    "cloudy": "☁️",
    "rain": "🌧️",
    "showers-day": "🌦️",
    "showers-night": "🌧️",
    "thunder-rain": "⛈️",
    "thunder-showers-day": "⛈️",
    "thunder-showers-night": "⛈️",
    "snow": "❄️",
    "snow-showers-day": "🌨️",
    "snow-showers-night": "🌨️",
    "fog": "🌫️",
    "wind": "💨"
  };
  return icons[icon] || "🌤️";
}

function formatDate(dateString, options = { weekday: "short", month: "short", day: "numeric" }) {
  return new Intl.DateTimeFormat(undefined, options).format(new Date(`${dateString}T12:00:00`));
}

async function fetchWeather(location) {
  const url = `${API_BASE}/${encodeURIComponent(location)}?unitGroup=metric&include=current,days&key=&contentType=json`;
  const response = await fetch(url);

  if (!response.ok) {
    let message = `Weather request failed (${response.status}).`;
    try {
      const errorText = await response.text();
      if (errorText) message = errorText.slice(0, 220);
    } catch (_) {
      // Keep the fallback message.
    }
    throw new Error(message);
  }

  return response.json();
}

// Keep only the fields our interface needs.
function processWeatherData(data) {
  const current = data.currentConditions;
  const days = data.days.slice(0, 5);

  return {
    location: data.resolvedAddress || data.address,
    current: {
      datetime: current.datetime,
      temp: current.temp,
      feelsLike: current.feelslike,
      conditions: current.conditions,
      icon: current.icon,
      humidity: current.humidity,
      windSpeed: current.windspeed,
      uvIndex: current.uvindex,
      pressure: current.pressure
    },
    forecast: days.map((day) => ({
      date: day.datetime,
      tempMax: day.tempmax,
      tempMin: day.tempmin,
      conditions: day.conditions,
      icon: day.icon
    }))
  };
}

function convertTemperature(celsius) {
  return temperatureUnit === "C" ? celsius : (celsius * 9) / 5 + 32;
}

function roundedTemperature(value) {
  return Math.round(convertTemperature(value));
}

function renderWeather(weather) {
  const { current, forecast } = weather;
  const unit = temperatureUnit === "C" ? "°C" : "°F";

  document.querySelector("#place-name").textContent = weather.location;
  document.querySelector("#date-line").textContent = formatDate(current.datetime, {
    weekday: "long", month: "long", day: "numeric"
  });
  document.querySelector("#weather-symbol").textContent = getWeatherIcon(current.icon);
  document.querySelector("#temperature").textContent = roundedTemperature(current.temp);
  document.querySelector("#temperature-unit").textContent = unit;
  document.querySelector("#conditions").textContent = current.conditions;
  document.querySelector("#feels-like").textContent = `Feels like ${roundedTemperature(current.feelsLike)}${unit}`;
  document.querySelector("#humidity").textContent = `${Math.round(current.humidity)}%`;
  document.querySelector("#wind-speed").textContent = `${Math.round(current.windSpeed)} km/h`;
  document.querySelector("#uv-index").textContent = current.uvIndex;
  document.querySelector("#pressure").textContent = `${Math.round(current.pressure)} hPa`;

  const forecastList = document.querySelector("#forecast-list");
  forecastList.replaceChildren();

  forecast.forEach((day, index) => {
    const item = document.createElement("article");
    item.className = "forecast-item";

    const dayName = document.createElement("span");
    dayName.className = "forecast-day";
    dayName.textContent = index === 0 ? "Today" : formatDate(day.date, { weekday: "short" });

    const icon = document.createElement("span");
    icon.className = "forecast-icon";
    icon.textContent = getWeatherIcon(day.icon);
    icon.setAttribute("aria-label", day.conditions);

    const condition = document.createElement("span");
    condition.className = "forecast-condition";
    condition.textContent = day.conditions;

    const temperatures = document.createElement("span");
    temperatures.className = "forecast-temperatures";
    temperatures.innerHTML = `<strong>${roundedTemperature(day.tempMax)}°</strong> <span>${roundedTemperature(day.tempMin)}°</span>`;

    item.append(dayName, icon, condition, temperatures);
    forecastList.append(item);
  });

  weatherPanel.classList.remove("hidden");
}

function setLoading(isLoading) {
  searchButton.disabled = isLoading;
  searchButton.innerHTML = isLoading
    ? '<span class="spinner"></span> Finding...'
    : 'Find weather <span aria-hidden="true">→</span>';
  statusMessage.textContent = isLoading ? "Looking up the sky for you..." : "";
  statusMessage.classList.toggle("loading", isLoading);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const location = locationInput.value.trim();
  if (!location) return;

  setLoading(true);
  weatherPanel.classList.add("hidden");

  try {
    const rawData = await fetchWeather(location);
    console.log("Weather API response:", rawData);
    currentWeather = processWeatherData(rawData);
    renderWeather(currentWeather);
    statusMessage.textContent = `Here's the forecast for ${currentWeather.location}.`;
  } catch (error) {
    console.error(error);
    statusMessage.textContent = `Couldn't find that weather data. ${error.message} Check the location or API access and try again.`;
  } finally {
    setLoading(false);
  }
});

function changeUnit(unit) {
  temperatureUnit = unit;
  celsiusButton.classList.toggle("active", unit === "C");
  fahrenheitButton.classList.toggle("active", unit === "F");
  if (currentWeather) renderWeather(currentWeather);
}

celsiusButton.addEventListener("click", () => changeUnit("C"));
fahrenheitButton.addEventListener("click", () => changeUnit("F"));

// Load a default city so the dashboard is not empty on first visit.
locationInput.value = "Montreal";
form.requestSubmit();
