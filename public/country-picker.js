/* ASD Industry: A–Z searchable ISO 3166-1 country/territory picker, no network calls. */
"use strict";
(() => {
  const names = ["Afghanistan","Albania","Algeria","American Samoa","Andorra","Angola","Anguilla","Antarctica","Antigua and Barbuda","Argentina","Armenia","Aruba","Australia","Austria","Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bermuda","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Bouvet Island","Brazil","British Indian Ocean Territory","British Virgin Islands","Brunei","Bulgaria","Burkina Faso","Burundi","Cabo Verde","Cambodia","Cameroon","Canada","Caribbean Netherlands","Cayman Islands","Central African Republic","Chad","Chile","China","Christmas Island","Cocos (Keeling) Islands","Colombia","Comoros","Cook Islands","Costa Rica","Croatia","Cuba","Curaçao","Cyprus","Czechia","Côte d’Ivoire","Democratic Republic of the Congo","Denmark","Djibouti","Dominica","Dominican Republic","Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia","Falkland Islands","Faroe Islands","Fiji","Finland","France","French Guiana","French Polynesia","French Southern Territories","Gabon","Gambia","Georgia","Germany","Ghana","Gibraltar","Greece","Greenland","Grenada","Guadeloupe","Guam","Guatemala","Guernsey","Guinea","Guinea-Bissau","Guyana","Haiti","Heard Island and McDonald Islands","Honduras","Hong Kong","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Isle of Man","Israel","Italy","Jamaica","Japan","Jersey","Jordan","Kazakhstan","Kenya","Kiribati","Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Macau","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Martinique","Mauritania","Mauritius","Mayotte","Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Montserrat","Morocco","Mozambique","Myanmar","Namibia","Nauru","Nepal","Netherlands","New Caledonia","New Zealand","Nicaragua","Niger","Nigeria","Niue","Norfolk Island","North Korea","North Macedonia","Northern Mariana Islands","Norway","Oman","Pakistan","Palau","Palestine","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Pitcairn","Poland","Portugal","Puerto Rico","Qatar","Republic of the Congo","Romania","Russia","Rwanda","Réunion","Saint Barthélemy","Saint Helena","Saint Kitts and Nevis","Saint Lucia","Saint Martin","Saint Pierre and Miquelon","Saint Vincent and the Grenadines","Samoa","San Marino","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Sint Maarten (Dutch part)","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Georgia and the South Sandwich Islands","South Korea","South Sudan","Spain","Sri Lanka","Sudan","Suriname","Svalbard and Jan Mayen","Sweden","Switzerland","Syria","São Tomé and Príncipe","Taiwan","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tokelau","Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Turks and Caicos Islands","Tuvalu","U.S. Outlying Islands","U.S. Virgin Islands","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan","Vanuatu","Vatican City","Venezuela","Vietnam","Wallis and Futuna","Western Sahara","Yemen","Zambia","Zimbabwe","Åland Islands"];
  const countries = names.sort((a,b) => a.localeCompare(b, "en", {sensitivity:"base"}));
  const normal = s => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .toLowerCase().replace(/[’']/g,"").replace(/[.\-]/g," ").replace(/\s+/g," ").trim();
  const byName = new Map(countries.map(name => [normal(name), name]));
  const aliases = new Map([
    ["usa","United States"],["us","United States"],["uk","United Kingdom"],
    ["uae","United Arab Emirates"],["ivory coast","Côte d’Ivoire"],
    ["turkiye","Turkey"],["czech republic","Czechia"],["burma","Myanmar"],
    ["cape verde","Cabo Verde"],["vatican","Vatican City"],
    ["east timor","Timor-Leste"],["sao tome","São Tomé and Príncipe"]
  ]);
  const canonicalize = value => byName.get(normal(value)) || aliases.get(normal(value)) || "";
  const aliasEntries = [...aliases.entries()];
  const nameMatches = (name, query) => normal(name).includes(query)
    || aliasEntries.some(([alias, target]) => target === name && alias.includes(query));
  function initPicker(wrapper) {
    const input = wrapper.querySelector("input.country-input");
    const toggle = wrapper.querySelector(".country-picker-toggle");
    const list = wrapper.querySelector(".country-picker-list");
    if (!input || !toggle || !list) return;
    let visible = [];
    let active = -1;
    function close() {
      list.hidden = true;
      input.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-expanded", "false");
      input.removeAttribute("aria-activedescendant");
      active = -1;
    }
    function setActive(index) {
      if (active >= 0 && list.children[active]) {
        list.children[active].classList.remove("active");
        list.children[active].setAttribute("aria-selected", "false");
      }
      active = index;
      const item = list.children[active];
      if (item) {
        item.classList.add("active");
        item.setAttribute("aria-selected", "true");
        input.setAttribute("aria-activedescendant", item.id);
        item.scrollIntoView({block:"nearest"});
      } else input.removeAttribute("aria-activedescendant");
    }
    function choose(name) {
      input.value = name;
      input.setCustomValidity("");
      input.dispatchEvent(new Event("change", {bubbles:true}));
      close(); // Don't re-open the list or force the mobile keyboard after a tap.
    }
    function open(query = "") {
      visible = countries.filter(name => nameMatches(name, normal(query)));
      list.replaceChildren();
      active = -1;
      input.removeAttribute("aria-activedescendant");
      if (!visible.length) {
        const none = document.createElement("p");
        none.className = "country-empty";
        none.textContent = "No country found. Try another spelling.";
        list.append(none);
      } else {
        const fragment = document.createDocumentFragment();
        visible.forEach((name,index) => {
          const option = document.createElement("div");
          option.className = "country-option";
          option.id = input.id + "-choice-" + index;
          option.setAttribute("role","option");
          option.setAttribute("aria-selected","false");
          option.textContent = name;
          option.addEventListener("pointerdown", e => e.preventDefault());
          option.addEventListener("click", () => choose(name));
          fragment.append(option);
        });
        list.append(fragment);
      }
      list.hidden = false;
      input.setAttribute("aria-expanded","true");
      toggle.setAttribute("aria-expanded","true");
      list.scrollTop = 0;
    }
    toggle.addEventListener("click", () => {
      if (list.hidden) open(""); // Arrow always shows the full alphabetical list.
      else close();
    });
    input.addEventListener("input", () => {
      input.setCustomValidity("");
      open(input.value); // Typing filters the list without requiring dropdown interaction.
    });
    input.addEventListener("focus", () => {
      if (list.hidden) open(input.value === canonicalize(input.value) ? "" : input.value);
    });
    input.addEventListener("keydown", event => {
      if (event.key === "Escape" && !list.hidden) {
        event.preventDefault();close();return;
      }
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        if (list.hidden) open(input.value);
        if (visible.length) setActive((active + (event.key === "ArrowDown" ? 1 : -1) + visible.length) % visible.length);
      }
      if (event.key === "Enter" && !list.hidden) {
        const selection = visible[active] || (visible.length === 1 ? visible[0] : null);
        if (selection) { event.preventDefault();choose(selection); }
        else if (visible.length) event.preventDefault();
      }
    });
    input.addEventListener("blur", () => {
      const resolved = canonicalize(input.value);
      if (resolved) {input.value = resolved;input.setCustomValidity("");}
      // Allow mouse/touch selections to fire before closing.
      setTimeout(() => {
        if (!wrapper.contains(document.activeElement)) close();
      }, 120);
    });
    document.addEventListener("pointerdown", event => {
      if (!wrapper.contains(event.target)) close();
    });
  }
  document.querySelectorAll("[data-country-picker]").forEach(initPicker);
  window.ASDCountryPicker = {canonicalize, countryCount:countries.length};
})();
