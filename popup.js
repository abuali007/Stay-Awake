// حفظ المراجع للعناصر
const togglePageBtn = document.getElementById('togglePage');
const enableAllBtn = document.getElementById('enableAll');
const intervalInput = document.getElementById('interval');
const autoEnableCheckbox = document.getElementById('autoEnable');
const saveStateCheckbox = document.getElementById('saveState');
const statusElement = document.getElementById('status');

// متغير لتخزين معلومات الصفحة الحالية
let currentTab = null;
let isActive = false;

// تحميل الإعدادات عند فتح النافذة المنبثقة
document.addEventListener('DOMContentLoaded', async () => {
  // تحميل الإعدادات من التخزين
  const settings = await chrome.storage.local.get({
    interval: 1,
    autoEnable: false,
    saveState: true
  });
  
  // تعيين قيم الإعدادات في واجهة المستخدم
  intervalInput.value = settings.interval;
  autoEnableCheckbox.checked = settings.autoEnable;
  saveStateCheckbox.checked = settings.saveState;
  
  // الحصول على الصفحة الحالية وتحديث الحالة
  await updateCurrentTabStatus();
  
  // إضافة مؤقت لتحديث الحالة كل ثانية
  setInterval(updateCurrentTabStatus, 1000);
});

// تحديث حالة الصفحة الحالية
async function updateCurrentTabStatus() {
  try {
    // الحصول على الصفحة الحالية
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tabs[0];
    
    if (!currentTab || !currentTab.url || !currentTab.url.startsWith('http')) {
      // إذا لم تكن صفحة ويب عادية
      togglePageBtn.textContent = "⚠️ لا يمكن تفعيل هذه الصفحة";
      togglePageBtn.disabled = true;
      statusElement.textContent = "هذه الصفحة غير مدعومة";
      statusElement.className = "status inactive";
      return;
    }
    
    // التحقق من حالة الصفحة
    const response = await chrome.runtime.sendMessage({
      action: "checkTabStatus",
      url: currentTab.url
    });
    
    isActive = response.active;
    
    // تحديث واجهة المستخدم
    if (isActive) {
      togglePageBtn.textContent = "⏹️ إيقاف لهذه الصفحة";
      togglePageBtn.classList.add('active');
      togglePageBtn.classList.remove('inactive');
      statusElement.textContent = "نشط في الصفحة الحالية";
      statusElement.className = "status active";
    } else {
      togglePageBtn.textContent = "▶️ تفعيل لهذه الصفحة";
      togglePageBtn.classList.add('inactive');
      togglePageBtn.classList.remove('active');
      statusElement.textContent = "غير نشط في الصفحة الحالية";
      statusElement.className = "status inactive";
    }
    
    // تمكين الزر
    togglePageBtn.disabled = false;
  } catch (error) {
    console.error("خطأ في تحديث حالة الصفحة:", error);
    statusElement.textContent = "تعذر تحديد الحالة";
    statusElement.className = "status";
  }
}

// تفعيل/إيقاف للصفحة الحالية
togglePageBtn.addEventListener('click', async () => {
  if (!currentTab || !currentTab.url || !currentTab.url.startsWith('http')) {
    return;
  }
  
  try {
    // تعطيل الزر أثناء المعالجة
    togglePageBtn.disabled = true;
    statusElement.textContent = isActive ? "جاري إيقاف التفعيل..." : "جاري التفعيل...";
    
    // إرسال طلب لتبديل حالة الصفحة
    const response = await chrome.runtime.sendMessage({
      action: "toggleTab",
      tabId: currentTab.id,
      url: currentTab.url,
      active: !isActive
    });
    
    // تحديث الحالة المحلية
    isActive = response.active;
    
    // تحديث واجهة المستخدم
    if (isActive) {
      togglePageBtn.textContent = "⏹️ إيقاف لهذه الصفحة";
      togglePageBtn.classList.add('active');
      togglePageBtn.classList.remove('inactive');
      statusElement.textContent = "نشط في الصفحة الحالية";
      statusElement.className = "status active";
    } else {
      togglePageBtn.textContent = "▶️ تفعيل لهذه الصفحة";
      togglePageBtn.classList.add('inactive');
      togglePageBtn.classList.remove('active');
      statusElement.textContent = "غير نشط في الصفحة الحالية";
      statusElement.className = "status inactive";
    }
    
    // إعادة تمكين الزر
    togglePageBtn.disabled = false;
  } catch (error) {
    console.error("خطأ في تبديل حالة الصفحة:", error);
    statusElement.textContent = "حدث خطأ أثناء التنفيذ";
    togglePageBtn.disabled = false;
  }
});

// تفعيل جميع الصفحات
enableAllBtn.addEventListener('click', async () => {
  try {
    // تعطيل الزر أثناء المعالجة
    enableAllBtn.disabled = true;
    statusElement.textContent = "جاري تفعيل جميع الصفحات...";
    
    // إرسال طلب لتفعيل جميع الصفحات
    await chrome.runtime.sendMessage({
      action: "activateAllTabs"
    });
    
    // تحديث حالة الصفحة الحالية
    await updateCurrentTabStatus();
    
    statusElement.textContent = "تم تفعيل جميع الصفحات";
    statusElement.className = "status active";
    
    // إعادة تمكين الزر
    enableAllBtn.disabled = false;
  } catch (error) {
    console.error("خطأ في تفعيل جميع الصفحات:", error);
    statusElement.textContent = "حدث خطأ أثناء تفعيل الصفحات";
    enableAllBtn.disabled = false;
  }
});

// حفظ الإعدادات عند تغييرها
function saveSettings() {
  // تعطيل الإدخال أثناء الحفظ
  intervalInput.disabled = true;
  autoEnableCheckbox.disabled = true;
  saveStateCheckbox.disabled = true;
  
  const settings = {
    interval: parseInt(intervalInput.value) || 1,
    autoEnable: autoEnableCheckbox.checked,
    saveState: saveStateCheckbox.checked
  };
  
  chrome.runtime.sendMessage({
    action: "updateSettings",
    settings: settings
  }, () => {
    // إعادة تمكين الإدخال بعد الحفظ
    intervalInput.disabled = false;
    autoEnableCheckbox.disabled = false;
    saveStateCheckbox.disabled = false;
    
    // عرض رسالة تأكيد مؤقتة
    const originalText = statusElement.textContent;
    statusElement.textContent = "تم حفظ الإعدادات";
    setTimeout(() => {
      statusElement.textContent = originalText;
    }, 1500);
  });
}

// إضافة مستمعي الأحداث للإعدادات
intervalInput.addEventListener('change', saveSettings);
autoEnableCheckbox.addEventListener('change', saveSettings);
saveStateCheckbox.addEventListener('change', saveSettings);

// إضافة زر معلومات التشخيص (مخفي في واجهة المستخدم العادية)
document.addEventListener('keydown', function(event) {
  // عند الضغط على Ctrl+Shift+D
  if (event.ctrlKey && event.shiftKey && event.key === 'D') {
    // طلب معلومات التشخيص
    chrome.runtime.sendMessage({ action: "getDebugInfo" }, function(response) {
      if (response && response.success) {
        console.log("معلومات التشخيص:", response.info);
        alert("تم عرض معلومات التشخيص في وحدة التحكم (Console)");
      }
    });
  }
});