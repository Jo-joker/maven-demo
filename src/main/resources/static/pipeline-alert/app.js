/**
 * 流水线告警策略配置 - 前端交互逻辑
 */

// ===== 示例数据 =====
const ALERT_TYPE_MAP = {
    queue_timeout: "排队超时",
    queue_depth: "排队深度",
    run_timeout: "运行超时",
    continuous_fail: "连续失败",
    resource_exhausted: "资源耗尽",
    queue_cancelled: "排队取消"
};

const ALERT_UNIT_MAP = {
    queue_timeout: "分钟",
    queue_depth: "条",
    run_timeout: "分钟",
    continuous_fail: "次",
    resource_exhausted: "分钟",
    queue_cancelled: ""
};

const ALERT_THRESHOLD_LABEL = {
    queue_timeout: "排队等待时间超过",
    queue_depth: "排队数量超过",
    run_timeout: "执行时间超过",
    continuous_fail: "连续失败次数 >=",
    resource_exhausted: "资源满载持续超过",
    queue_cancelled: "—"
};

const NOTIFY_METHOD_MAP = {
    dingtalk: "钉钉",
    email: "邮件",
    webhook: "Webhook",
    sms: "短信"
};

// 默认策略列表
let strategies = [
    {
        id: 1,
        name: "排队超时预警",
        type: "queue_timeout",
        threshold: 10,
        level: "warning",
        notifyMethods: ["dingtalk"],
        notifyTarget: "owner",
        silencePeriod: 30,
        scope: "all",
        enabled: true,
        description: "流水线在队列中等待超过阈值时触发告警"
    },
    {
        id: 2,
        name: "队列积压预警",
        type: "queue_depth",
        threshold: 5,
        level: "warning",
        notifyMethods: ["dingtalk", "email"],
        notifyTarget: "ops",
        silencePeriod: 30,
        scope: "all",
        enabled: true,
        description: "排队数量超过阈值，表示并发压力过大"
    },
    {
        id: 3,
        name: "运行超时告警",
        type: "run_timeout",
        threshold: 30,
        level: "critical",
        notifyMethods: ["dingtalk", "sms"],
        notifyTarget: "owner",
        silencePeriod: 60,
        scope: "all",
        enabled: true,
        description: "单条流水线执行时间超过预期"
    },
    {
        id: 4,
        name: "连续失败告警",
        type: "continuous_fail",
        threshold: 3,
        level: "critical",
        notifyMethods: ["dingtalk", "email"],
        notifyTarget: "committer",
        silencePeriod: 60,
        scope: "all",
        enabled: true,
        description: "同一流水线连续多次构建失败"
    },
    {
        id: 5,
        name: "并发资源耗尽",
        type: "resource_exhausted",
        threshold: 5,
        level: "critical",
        notifyMethods: ["dingtalk", "webhook"],
        notifyTarget: "admin",
        silencePeriod: 30,
        scope: "all",
        enabled: false,
        description: "所有并发槽位占满且持续一段时间无释放"
    },
    {
        id: 6,
        name: "排队自动取消通知",
        type: "queue_cancelled",
        threshold: 0,
        level: "info",
        notifyMethods: ["dingtalk"],
        notifyTarget: "owner",
        silencePeriod: 0,
        scope: "all",
        enabled: false,
        description: "流水线因排队超时被系统自动取消"
    }
];

let editingId = null;

// ===== 初始化 =====
document.addEventListener("DOMContentLoaded", function () {
    renderTable();
    updateOverview();

    document.getElementById("searchInput").addEventListener("input", function () {
        renderTable(this.value);
    });

    // 适用流水线切换
    document.querySelectorAll('input[name="pipelineScope"]').forEach(function (radio) {
        radio.addEventListener("change", function () {
            var filter = document.getElementById("pipelineFilter");
            filter.style.display = this.value === "selected" ? "block" : "none";
        });
    });
});

// ===== 渲染表格 =====
function renderTable(keyword) {
    var tbody = document.getElementById("strategyTableBody");
    var filtered = strategies;
    if (keyword) {
        keyword = keyword.toLowerCase();
        filtered = strategies.filter(function (s) {
            return s.name.toLowerCase().includes(keyword) ||
                ALERT_TYPE_MAP[s.type].includes(keyword);
        });
    }

    tbody.innerHTML = filtered.map(function (s) {
        var levelClass = "tag-" + s.level;
        var levelText = s.level === "critical" ? "严重" : s.level === "warning" ? "警告" : "通知";
        var conditionText = formatCondition(s);
        var notifyTags = s.notifyMethods.map(function (m) {
            return '<span class="notify-tag">' + NOTIFY_METHOD_MAP[m] + '</span>';
        }).join("");

        return '<tr>' +
            '<td><strong>' + escapeHtml(s.name) + '</strong></td>' +
            '<td>' + ALERT_TYPE_MAP[s.type] + '</td>' +
            '<td>' + conditionText + '</td>' +
            '<td><span class="tag ' + levelClass + '">' + levelText + '</span></td>' +
            '<td><div class="notify-tags">' + notifyTags + '</div></td>' +
            '<td>' + (s.silencePeriod > 0 ? s.silencePeriod + ' 分钟' : '无') + '</td>' +
            '<td>' +
            '  <label class="toggle-switch">' +
            '    <input type="checkbox" ' + (s.enabled ? 'checked' : '') +
            '      onchange="toggleStrategy(' + s.id + ', this.checked)">' +
            '    <span class="toggle-slider"></span>' +
            '  </label>' +
            '</td>' +
            '<td>' +
            '  <div class="action-group">' +
            '    <button class="btn btn-text btn-sm" onclick="editStrategy(' + s.id + ')">编辑</button>' +
            '    <button class="btn btn-danger-text btn-sm" onclick="deleteStrategy(' + s.id + ')">删除</button>' +
            '  </div>' +
            '</td>' +
            '</tr>';
    }).join("");
}

function formatCondition(strategy) {
    if (strategy.type === "queue_cancelled") {
        return "排队取消时触发";
    }
    var label = ALERT_THRESHOLD_LABEL[strategy.type];
    var unit = ALERT_UNIT_MAP[strategy.type];
    return label + " " + strategy.threshold + " " + unit;
}

// ===== 概览更新 =====
function updateOverview() {
    var enabled = strategies.filter(function (s) { return s.enabled; });
    var queueAlerts = enabled.filter(function (s) {
        return s.type === "queue_timeout" || s.type === "queue_depth";
    }).length;
    var timeoutAlerts = enabled.filter(function (s) {
        return s.type === "run_timeout" || s.type === "resource_exhausted";
    }).length;

    document.getElementById("queueAlertCount").textContent = queueAlerts;
    document.getElementById("timeoutAlertCount").textContent = timeoutAlerts;
    document.getElementById("strategyCount").textContent = strategies.length;
    document.getElementById("enabledCount").textContent = enabled.length;
    document.getElementById("activeAlertCount").textContent = enabled.length + " 条活跃告警";
}

// ===== 弹窗 =====
function openModal() {
    editingId = null;
    document.getElementById("modalTitle").textContent = "新建告警策略";
    document.getElementById("strategyForm").reset();
    document.getElementById("modalOverlay").classList.add("active");
}

function closeModal(event) {
    if (event && event.target !== document.getElementById("modalOverlay")) return;
    document.getElementById("modalOverlay").classList.remove("active");
    editingId = null;
}

// ===== 条件 UI 动态更新 =====
function updateConditionUI() {
    var type = document.getElementById("alertType").value;
    var thresholdGroup = document.getElementById("thresholdGroup");
    var thresholdLabel = document.getElementById("thresholdLabel");
    var thresholdUnit = document.getElementById("thresholdUnit");
    var thresholdInput = document.getElementById("thresholdValue");

    if (type === "queue_cancelled") {
        thresholdGroup.style.display = "none";
        thresholdInput.removeAttribute("required");
    } else {
        thresholdGroup.style.display = "";
        thresholdInput.setAttribute("required", "required");
        thresholdLabel.innerHTML = ALERT_THRESHOLD_LABEL[type] + ' <span class="required">*</span>';
        thresholdUnit.textContent = ALERT_UNIT_MAP[type];
    }
}

// ===== 保存策略 =====
function saveStrategy(event) {
    event.preventDefault();

    var notifyMethods = [];
    document.querySelectorAll('input[name="notifyMethod"]:checked').forEach(function (cb) {
        notifyMethods.push(cb.value);
    });

    if (notifyMethods.length === 0) {
        alert("请至少选择一种通知方式");
        return;
    }

    var strategy = {
        name: document.getElementById("strategyName").value.trim(),
        type: document.getElementById("alertType").value,
        threshold: parseInt(document.getElementById("thresholdValue").value) || 0,
        level: document.getElementById("alertLevel").value,
        notifyMethods: notifyMethods,
        notifyTarget: document.getElementById("notifyTarget").value,
        silencePeriod: parseInt(document.getElementById("silencePeriod").value) || 0,
        scope: document.querySelector('input[name="pipelineScope"]:checked').value,
        description: document.getElementById("strategyDesc").value.trim(),
        enabled: true
    };

    if (editingId) {
        var idx = strategies.findIndex(function (s) { return s.id === editingId; });
        if (idx !== -1) {
            strategy.id = editingId;
            strategy.enabled = strategies[idx].enabled;
            strategies[idx] = strategy;
        }
    } else {
        strategy.id = strategies.length > 0 ? Math.max.apply(null, strategies.map(function (s) { return s.id; })) + 1 : 1;
        strategies.push(strategy);
    }

    renderTable();
    updateOverview();
    document.getElementById("modalOverlay").classList.remove("active");
    editingId = null;
}

// ===== 编辑策略 =====
function editStrategy(id) {
    var strategy = strategies.find(function (s) { return s.id === id; });
    if (!strategy) return;

    editingId = id;
    document.getElementById("modalTitle").textContent = "编辑告警策略";
    document.getElementById("strategyName").value = strategy.name;
    document.getElementById("alertType").value = strategy.type;
    document.getElementById("thresholdValue").value = strategy.threshold;
    document.getElementById("alertLevel").value = strategy.level;
    document.getElementById("notifyTarget").value = strategy.notifyTarget;
    document.getElementById("silencePeriod").value = strategy.silencePeriod;
    document.getElementById("strategyDesc").value = strategy.description || "";

    // 设置通知方式
    document.querySelectorAll('input[name="notifyMethod"]').forEach(function (cb) {
        cb.checked = strategy.notifyMethods.includes(cb.value);
    });

    // 设置流水线范围
    document.querySelector('input[name="pipelineScope"][value="' + strategy.scope + '"]').checked = true;

    updateConditionUI();
    document.getElementById("modalOverlay").classList.add("active");
}

// ===== 删除策略 =====
function deleteStrategy(id) {
    var strategy = strategies.find(function (s) { return s.id === id; });
    if (!strategy) return;
    if (!confirm('确定删除策略 "' + strategy.name + '" 吗？')) return;

    strategies = strategies.filter(function (s) { return s.id !== id; });
    renderTable();
    updateOverview();
}

// ===== 切换启用状态 =====
function toggleStrategy(id, enabled) {
    var strategy = strategies.find(function (s) { return s.id === id; });
    if (strategy) {
        strategy.enabled = enabled;
        updateOverview();
    }
}

// ===== 工具函数 =====
function escapeHtml(text) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
}
