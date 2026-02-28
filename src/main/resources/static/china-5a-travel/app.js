const state = {
  meta: null,
  allAttractions: [],
  filteredAttractions: [],
  currentPage: 1,
  pageSize: 18,
};

const elements = {
  searchInput: document.getElementById("searchInput"),
  provinceSelect: document.getElementById("provinceSelect"),
  sortSelect: document.getElementById("sortSelect"),
  resultText: document.getElementById("resultText"),
  cardList: document.getElementById("cardList"),
  cardTemplate: document.getElementById("cardTemplate"),
  prevBtn: document.getElementById("prevBtn"),
  nextBtn: document.getElementById("nextBtn"),
  pageInfo: document.getElementById("pageInfo"),
  totalAttractions: document.getElementById("totalAttractions"),
  totalProvinces: document.getElementById("totalProvinces"),
  avgTicketPrice: document.getElementById("avgTicketPrice"),
  lastUpdated: document.getElementById("lastUpdated"),
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  bindEvents();
  try {
    const response = await fetch("./data/attractions.json");
    if (!response.ok) {
      throw new Error(`数据加载失败: ${response.status}`);
    }
    const payload = await response.json();
    state.meta = payload.meta;
    state.allAttractions = payload.attractions || [];
    populateProvinceOptions(state.allAttractions);
    updateStats();
    applyFilters();
  } catch (error) {
    elements.resultText.textContent = `加载失败：${error.message}`;
    elements.cardList.innerHTML = "";
    elements.pageInfo.textContent = "第 0 / 0 页";
  }
}

function bindEvents() {
  elements.searchInput.addEventListener("input", () => {
    state.currentPage = 1;
    applyFilters();
  });
  elements.provinceSelect.addEventListener("change", () => {
    state.currentPage = 1;
    applyFilters();
  });
  elements.sortSelect.addEventListener("change", () => {
    state.currentPage = 1;
    applyFilters();
  });

  elements.prevBtn.addEventListener("click", () => {
    if (state.currentPage > 1) {
      state.currentPage -= 1;
      render();
    }
  });

  elements.nextBtn.addEventListener("click", () => {
    const totalPages = getTotalPages();
    if (state.currentPage < totalPages) {
      state.currentPage += 1;
      render();
    }
  });
}

function populateProvinceOptions(attractions) {
  const provinces = [...new Set(attractions.map((item) => item.province))]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));

  provinces.forEach((province) => {
    const option = document.createElement("option");
    option.value = province;
    option.textContent = province;
    elements.provinceSelect.appendChild(option);
  });
}

function applyFilters() {
  const keyword = elements.searchInput.value.trim().toLowerCase();
  const selectedProvince = elements.provinceSelect.value;
  const sortType = elements.sortSelect.value;

  let list = [...state.allAttractions];

  if (selectedProvince) {
    list = list.filter((item) => item.province === selectedProvince);
  }

  if (keyword) {
    list = list.filter((item) => {
      const fields = [
        item.name,
        item.province,
        item.prefecture,
        item.county,
        ...(item.aliases || []),
        ...item.nearbyHotels.map((h) => `${h.name} ${h.address}`),
        ...item.nearbyRestaurants.map((r) => `${r.name} ${r.address} ${r.cuisine}`),
      ];
      return fields.join(" ").toLowerCase().includes(keyword);
    });
  }

  list = sortAttractions(list, sortType);
  state.filteredAttractions = list;

  const totalPages = Math.max(1, getTotalPages());
  if (state.currentPage > totalPages) {
    state.currentPage = totalPages;
  }
  render();
}

function sortAttractions(list, sortType) {
  const cloned = [...list];
  if (sortType === "ticketAsc") {
    return cloned.sort((a, b) => a.ticketPriceCny - b.ticketPriceCny);
  }
  if (sortType === "ticketDesc") {
    return cloned.sort((a, b) => b.ticketPriceCny - a.ticketPriceCny);
  }
  if (sortType === "hotelAsc") {
    return cloned.sort((a, b) => avgHotelPrice(a) - avgHotelPrice(b));
  }
  if (sortType === "hotelDesc") {
    return cloned.sort((a, b) => avgHotelPrice(b) - avgHotelPrice(a));
  }
  if (sortType === "foodAsc") {
    return cloned.sort((a, b) => avgFoodPrice(a) - avgFoodPrice(b));
  }
  if (sortType === "foodDesc") {
    return cloned.sort((a, b) => avgFoodPrice(b) - avgFoodPrice(a));
  }

  return cloned.sort((a, b) => {
    const provinceDiff = a.province.localeCompare(b.province, "zh-Hans-CN");
    if (provinceDiff !== 0) {
      return provinceDiff;
    }
    return a.name.localeCompare(b.name, "zh-Hans-CN");
  });
}

function avgHotelPrice(item) {
  return Math.round(
    item.nearbyHotels.reduce((sum, hotel) => sum + hotel.priceAvgCny, 0) /
      item.nearbyHotels.length
  );
}

function avgFoodPrice(item) {
  return Math.round(
    item.nearbyRestaurants.reduce((sum, food) => sum + food.avgPriceCny, 0) /
      item.nearbyRestaurants.length
  );
}

function getTotalPages() {
  return Math.ceil(state.filteredAttractions.length / state.pageSize);
}

function render() {
  const list = state.filteredAttractions;
  const total = list.length;
  const totalPages = Math.max(1, getTotalPages());
  const startIndex = (state.currentPage - 1) * state.pageSize;
  const pageItems = list.slice(startIndex, startIndex + state.pageSize);

  elements.resultText.textContent = `共匹配 ${total} 个景区，当前第 ${state.currentPage} 页，每页 ${state.pageSize} 条。`;
  elements.pageInfo.textContent = `第 ${state.currentPage} / ${totalPages} 页`;
  elements.prevBtn.disabled = state.currentPage <= 1;
  elements.nextBtn.disabled = state.currentPage >= totalPages;

  elements.cardList.innerHTML = "";
  if (!pageItems.length) {
    elements.cardList.innerHTML =
      "<p>没有找到符合条件的景区，请更换关键词或筛选条件。</p>";
    return;
  }

  pageItems.forEach((item) => {
    const fragment = elements.cardTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".spot-card");
    const nameEl = fragment.querySelector(".spot-name");
    const locationEl = fragment.querySelector(".spot-location");
    const dateEl = fragment.querySelector(".spot-date");
    const ticketEl = fragment.querySelector(".ticket-price");
    const tagsEl = fragment.querySelector(".spot-tags");
    const mapLinkEl = fragment.querySelector(".map-link");
    const hotelsBtn = fragment.querySelector(".toggle-hotels");
    const foodsBtn = fragment.querySelector(".toggle-foods");
    const hotelsPanel = fragment.querySelector(".hotels-panel");
    const foodsPanel = fragment.querySelector(".foods-panel");

    nameEl.textContent = item.name;
    locationEl.textContent = `位置：${item.province}${item.prefecture}${item.county}`;
    dateEl.textContent = `5A认定时间：${item.approvalDate} | 数据来源：${item.source}`;
    ticketEl.textContent = `¥${item.ticketPriceCny}`;

    const tags = [
      `酒店均价 ¥${avgHotelPrice(item)}/晚`,
      `餐饮人均 ¥${avgFoodPrice(item)}`,
      `参考坐标 ${item.coordinates.lat.toFixed(4)}, ${item.coordinates.lng.toFixed(4)}`,
    ];
    if (item.composedFrom?.length) {
      tags.push(`组合景区：${item.composedFrom.length} 个核心片区`);
    }
    tags.forEach((tag) => {
      const span = document.createElement("span");
      span.className = "tag";
      span.textContent = tag;
      tagsEl.appendChild(span);
    });

    const mapKeyword = encodeURIComponent(`${item.name} ${item.province}${item.prefecture}${item.county}`);
    mapLinkEl.href = `https://ditu.amap.com/search?query=${mapKeyword}`;
    mapLinkEl.textContent = "高德地图检索";

    hotelsBtn.addEventListener("click", () => {
      const hidden = hotelsPanel.classList.contains("hidden");
      if (hidden) {
        renderHotelPanel(hotelsPanel, item.nearbyHotels);
      }
      hotelsPanel.classList.toggle("hidden");
      hotelsBtn.textContent = hotelsPanel.classList.contains("hidden")
        ? "查看附近酒店"
        : "收起酒店信息";
    });

    foodsBtn.addEventListener("click", () => {
      const hidden = foodsPanel.classList.contains("hidden");
      if (hidden) {
        renderFoodPanel(foodsPanel, item.nearbyRestaurants);
      }
      foodsPanel.classList.toggle("hidden");
      foodsBtn.textContent = foodsPanel.classList.contains("hidden")
        ? "查看附近餐饮"
        : "收起餐饮信息";
    });

    card.dataset.id = item.id;
    elements.cardList.appendChild(fragment);
  });
}

function renderHotelPanel(panel, hotels) {
  panel.innerHTML = "";
  hotels.forEach((hotel) => {
    const block = document.createElement("article");
    block.className = "detail-item";

    const title = document.createElement("h4");
    title.textContent = hotel.name;
    block.appendChild(title);

    const lines = [
      `位置：${hotel.address}`,
      `距离景区：${hotel.distanceKm} km`,
      `价格参考：¥${hotel.priceMinCny}-${hotel.priceMaxCny} / 晚`,
      `评分参考：${hotel.rating.toFixed(1)} / 5`,
      `电话：${hotel.phone}`,
    ];
    lines.forEach((line) => {
      const p = document.createElement("p");
      p.textContent = line;
      block.appendChild(p);
    });
    panel.appendChild(block);
  });
}

function renderFoodPanel(panel, foods) {
  panel.innerHTML = "";
  foods.forEach((food) => {
    const block = document.createElement("article");
    block.className = "detail-item";

    const title = document.createElement("h4");
    title.textContent = food.name;
    block.appendChild(title);

    const lines = [
      `位置：${food.address}`,
      `距离景区：${food.distanceKm} km`,
      `人均参考：¥${food.avgPriceCny}`,
      `菜系/类型：${food.cuisine}`,
      `营业时间：${food.openHours}`,
      `评分参考：${food.rating.toFixed(1)} / 5`,
      `电话：${food.phone}`,
    ];
    lines.forEach((line) => {
      const p = document.createElement("p");
      p.textContent = line;
      block.appendChild(p);
    });
    panel.appendChild(block);
  });
}

function updateStats() {
  const attractions = state.allAttractions;
  const provinceCount = new Set(attractions.map((item) => item.province)).size;
  const avgTicket = Math.round(
    attractions.reduce((sum, item) => sum + item.ticketPriceCny, 0) / attractions.length
  );

  elements.totalAttractions.textContent = String(attractions.length);
  elements.totalProvinces.textContent = String(provinceCount);
  elements.avgTicketPrice.textContent = `¥${avgTicket}`;
  elements.lastUpdated.textContent = formatDate(state.meta.generatedAt);
}

function formatDate(isoString) {
  if (!isoString) {
    return "-";
  }
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return isoString;
  }
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
