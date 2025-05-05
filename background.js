// تخزين حالات الصفحات
let activeTabsMap = {};
let settings = {
  interval: 1,
  autoEnable: false,
  saveState: true
};

// تحميل الإعدادات عند بدء التشغيل
chrome.storage.local.get({
  interval: 1,
  autoEnable: false,
  saveState: true,
  activeTabsMap: {}
}, (data) => {
  settings = {
    interval: data.interval,
    autoEnable: data.autoEnable,
    saveState: data.saveState
  };
  activeTabsMap = data.activeTabsMap || {};
  console.log("تم تحميل إعدادات Stay Awake Pro:", settings);
  
  // استعادة الصفحات النشطة
  if (settings.saveState) {
    restoreActiveTabs();
  }
});

// استعادة الصفحات النشطة
async function restoreActiveTabs() {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.url && activeTabsMap[tab.url]) {
      activateTab(tab.id);
    }
  }
}

// إنشاء منبهات متعددة للتحقق من الصفحات النشطة بتواترات مختلفة
chrome.alarms.create('tabWatcherFast', { periodInMinutes: 0.033 }); // كل 2 ثانية
chrome.alarms.create('tabWatcherMedium', { periodInMinutes: 0.1 }); // كل 6 ثوانٍ
chrome.alarms.create('tabWatcherSlow', { periodInMinutes: 0.5 }); // كل 30 ثانية

// الاستماع للمنبهات
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'tabWatcherFast') {
    // تنفيذ تحديثات سريعة (محاكاة حركة الماوس والنقرات)
    await updateActiveTabs('fast');
    updateBadgeForCurrentTab();
  } 
  else if (alarm.name === 'tabWatcherMedium') {
    // تنفيذ تحديثات متوسطة (تغيير حالة الصفحة)
    await updateActiveTabs('medium');
  }
  else if (alarm.name === 'tabWatcherSlow') {
    // تنفيذ تحديثات بطيئة (تنظيف وحفظ الحالة)
    await updateActiveTabs('slow');
    // حفظ الحالة دوريًا
    if (settings.saveState) {
      chrome.storage.local.set({ activeTabsMap });
    }
  }
});

// تحديث الصفحات النشطة بناءً على نوع التحديث
async function updateActiveTabs(updateType) {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.url && activeTabsMap[tab.url]) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (type) => {
            // تعريف متغير عام للتتبع
            if (typeof window.__stayAwakeData === 'undefined') {
              window.__stayAwakeData = {
                lastUpdate: Date.now(),
                counter: 0,
                active: true
              };
            }
            
            // تحديث البيانات
            window.__stayAwakeData.lastUpdate = Date.now();
            window.__stayAwakeData.counter++;
            
            // تنفيذ عملية تنشيط قوية
            Object.defineProperty(document, 'hidden', { value: false, configurable: true });
            Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
            document.dispatchEvent(new Event('visibilitychange'));
            window.dispatchEvent(new Event('focus'));
            
            // محاكاة تفاعل المستخدم
            const randomX = Math.floor(Math.random() * window.innerWidth);
            const randomY = Math.floor(Math.random() * window.innerHeight);
            
            // تحديثات سريعة - حركة الماوس والنقرات
            if (type === 'fast') {
              // محاكاة حركة الماوس
              window.dispatchEvent(new MouseEvent('mousemove', {
                clientX: randomX,
                clientY: randomY,
                bubbles: true
              }));
              
              // محاكاة نقرة فأرة عشوائية
              window.dispatchEvent(new MouseEvent('mousedown', {
                clientX: randomX,
                clientY: randomY,
                bubbles: true
              }));
              window.dispatchEvent(new MouseEvent('mouseup', {
                clientX: randomX,
                clientY: randomY,
                bubbles: true
              }));
              
              // محاكاة تمرير الصفحة
              window.scrollTo({
                top: Math.random() * 10,
                behavior: 'smooth'
              });
            }
            
            // تحديثات متوسطة - تغيير حالة الصفحة
            if (type === 'medium' || type === 'slow') {
              // محاكاة تفاعل لوحة المفاتيح
              window.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'Tab',
                bubbles: true
              }));
              window.dispatchEvent(new KeyboardEvent('keyup', {
                key: 'Tab',
                bubbles: true
              }));
              
              // تحديث عنوان الصفحة (يساعد في بعض مواقع PTC)
              if (document.title.indexOf('Stay Awake') === -1) {
                document.title = document.title + ' - Stay Awake';
                setTimeout(() => {
                  document.title = document.title.replace(' - Stay Awake', '');
                }, 500);
              }
              
              // محاولة منع السكون في مواقع PTC
              if (typeof window.ptc_active === 'undefined') {
                window.ptc_active = true;
              }
              if (typeof window.active === 'undefined') {
                window.active = true;
              }
            }
            
            // تحديثات بطيئة - تنظيف وإعادة تعيين
            if (type === 'slow') {
              // إعادة تعريف وظائف setTimeout و setInterval
              // هذا يمكن أن يساعد في مواقع PTC التي تستخدم هذه الوظائف للتحقق من النشاط
              const originalSetTimeout = window.setTimeout;
              const originalSetInterval = window.setInterval;
              const originalClearTimeout = window.clearTimeout;
              const originalClearInterval = window.clearInterval;
              
              // إعادة تعريف setTimeout
              window.setTimeout = function(callback, delay, ...args) {
                // تقليل التأخير للوظائف التي قد تتحقق من النشاط
                if (delay > 10000) {
                  delay = Math.min(delay, 5000);
                }
                return originalSetTimeout(callback, delay, ...args);
              };
              
              // إعادة تعريف setInterval
              window.setInterval = function(callback, delay, ...args) {
                // تقليل التأخير للوظائف التي قد تتحقق من النشاط
                if (delay > 10000) {
                  delay = Math.min(delay, 5000);
                }
                return originalSetInterval(callback, delay, ...args);
              };
              
              // استعادة الوظائف الأصلية بعد فترة قصيرة
              setTimeout(() => {
                window.setTimeout = originalSetTimeout;
                window.setInterval = originalSetInterval;
                window.clearTimeout = originalClearTimeout;
                window.clearInterval = originalClearInterval;
              }, 5000);
              
              // تنفيذ أي وظائف معلقة
              if (typeof window.runPendingTimeouts === 'function') {
                window.runPendingTimeouts();
              }
            }
            
            // إضافة معلومات التشخيص
            console.log(`Stay Awake Pro: تحديث ${type} #${window.__stayAwakeData.counter}`);
            
            return {
              success: true,
              counter: window.__stayAwakeData.counter,
              timestamp: window.__stayAwakeData.lastUpdate
            };
          },
          args: [updateType]
        });
      } catch (error) {
        console.error(`خطأ في تحديث الصفحة ${tab.id}:`, error);
        // إذا كان الخطأ بسبب إغلاق الصفحة، قم بإزالتها من القائمة
        if (error.message.includes('No tab with id') || error.message.includes('cannot be scripted')) {
          delete activeTabsMap[tab.url];
          chrome.storage.local.set({ activeTabsMap });
        }
      }
    }
  }
}

// تحديث شارة الأيقونة للصفحة الحالية
async function updateBadgeForCurrentTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url) {
      const isActive = !!activeTabsMap[tab.url];
      
      // تحديث نص الشارة
      chrome.action.setBadgeText({ 
        text: isActive ? "ON" : "",
        tabId: tab.id
      });
      
      // تحديث لون الشارة
      chrome.action.setBadgeBackgroundColor({ 
        color: isActive ? "#27ae60" : "#e74c3c",
        tabId: tab.id
      });
      
      // تحديث عنوان الأيقونة
      chrome.action.setTitle({
        title: isActive ? "Stay Awake Pro - مفعل على هذه الصفحة" : "Stay Awake Pro - غير مفعل، انقر للتفعيل",
        tabId: tab.id
      });
    }
  } catch (error) {
    console.error("خطأ في تحديث شارة الأيقونة:", error);
  }
}

// الاستماع لتغيير الصفحة النشطة
chrome.tabs.onActivated.addListener(updateBadgeForCurrentTab);
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    updateBadgeForCurrentTab();
    
    // التفعيل التلقائي إذا كان مفعلاً في الإعدادات
    if (settings.autoEnable && tab.url && tab.url.startsWith('http')) {
      activateTab(tabId);
    }
    // أو استعادة الحالة المحفوظة
    else if (settings.saveState && tab.url && activeTabsMap[tab.url]) {
      activateTab(tabId);
    }
  }
});

// الاستماع لرسائل من النافذة المنبثقة
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "toggleTab") {
    const { tabId, url, active } = message;
    
    if (active) {
      // تفعيل الصفحة
      activateTab(tabId);
      sendResponse({ success: true, active: true });
    } else {
      // إيقاف تفعيل الصفحة
      deactivateTab(tabId, url);
      sendResponse({ success: true, active: false });
    }
    
    return true; // للسماح بالرد غير المتزامن
  }
  else if (message.action === "checkTabStatus") {
    const { url } = message;
    const isActive = !!activeTabsMap[url];
    sendResponse({ active: isActive });
    return true;
  }
  else if (message.action === "updateSettings") {
    settings = message.settings;
    chrome.storage.local.set({ 
      interval: settings.interval,
      autoEnable: settings.autoEnable,
      saveState: settings.saveState
    });
    sendResponse({ success: true });
    return true;
  }
  else if (message.action === "activateAllTabs") {
    activateAllTabs();
    sendResponse({ success: true });
    return true;
  }
  else if (message.action === "getDebugInfo") {
    // إضافة وظيفة جديدة لجمع معلومات التشخيص
    getDebugInfo().then(info => {
      sendResponse({ success: true, info: info });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }
});

// جمع معلومات التشخيص
async function getDebugInfo() {
  const tabs = await chrome.tabs.query({});
  const activeTabsInfo = [];
  
  for (const tab of tabs) {
    if (tab.url && activeTabsMap[tab.url]) {
      try {
        const result = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            return {
              stayAwakeData: window.__stayAwakeData || null,
              title: document.title,
              url: window.location.href,
              hidden: document.hidden,
              visibilityState: document.visibilityState
            };
          }
        });
        
        activeTabsInfo.push({
          tabId: tab.id,
          url: tab.url,
          title: tab.title,
          data: result[0].result
        });
      } catch (error) {
        activeTabsInfo.push({
          tabId: tab.id,
          url: tab.url,
          title: tab.title,
          error: error.message
        });
      }
    }
  }
  
  return {
    activeTabsCount: Object.keys(activeTabsMap).length,
    totalTabsCount: tabs.length,
    settings: settings,
    activeTabs: activeTabsInfo,
    timestamp: Date.now()
  };
}

// تفعيل الصفحة
async function activateTab(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (tab.url && tab.url.startsWith('http')) {
      activeTabsMap[tab.url] = true;
      
      // تنفيذ تهيئة خاصة للصفحة
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          // إعداد بيانات التتبع
          window.__stayAwakeData = {
            lastUpdate: Date.now(),
            counter: 0,
            active: true,
            startTime: Date.now()
          };
          
          // تعديل خصائص الصفحة
          Object.defineProperty(document, 'hidden', { value: false, configurable: true });
          Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
          
          // إطلاق أحداث
          document.dispatchEvent(new Event('visibilitychange'));
          window.dispatchEvent(new Event('focus'));
          
          // إضافة مستمع للأحداث للتأكد من أن الصفحة تظل نشطة
          window.addEventListener('blur', function() {
            setTimeout(() => {
              window.focus();
              document.dispatchEvent(new Event('visibilitychange'));
            }, 100);
          });
          
          // تعريف وظائف خاصة بمواقع PTC
          window.ptc_active = true;
          window.active = true;
          window.isActive = true;
          window.isVisible = true;
          
          // تعريف وظيفة لتشغيل المؤقتات المعلقة
          window.runPendingTimeouts = function() {
            // محاولة تشغيل أي مؤقتات معلقة
            for (let i = 0; i < 1000; i++) {
              setTimeout(() => {}, 0);
            }
          };
          
          console.log("Stay Awake Pro: تم تفعيل الصفحة بنجاح");
          return true;
        }
      });
      
      // حفظ الحالة
      if (settings.saveState) {
        chrome.storage.local.set({ activeTabsMap });
      }
      
      // تحديث شارة الأيقونة
      chrome.action.setBadgeText({ 
        text: "ON",
        tabId: tabId
      });
      
      chrome.action.setBadgeBackgroundColor({ 
        color: "#27ae60",
        tabId: tabId
      });
      
      chrome.action.setTitle({
        title: "Stay Awake Pro - مفعل على هذه الصفحة",
        tabId: tabId
      });
      
      console.log(`✅ تم تفعيل الصفحة: ${tab.url}`);
    }
  } catch (error) {
    console.error("خطأ في تفعيل الصفحة:", error);
  }
}

// إيقاف تفعيل الصفحة
async function deactivateTab(tabId, url) {
  if (url && activeTabsMap[url]) {
    delete activeTabsMap[url];
    
    // إزالة التعديلات من الصفحة
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: () => {
          // إزالة بيانات التتبع
          if (window.__stayAwakeData) {
            window.__stayAwakeData.active = false;
          }
          
          console.log("Stay Awake Pro: تم إيقاف تفعيل الصفحة");
          return true;
        }
      });
    } catch (error) {
      console.error("خطأ في إزالة التعديلات من الصفحة:", error);
    }
    
    // حفظ الحالة
    if (settings.saveState) {
      chrome.storage.local.set({ activeTabsMap });
    }
    
    // تحديث شارة الأيقونة
    chrome.action.setBadgeText({ 
      text: "",
      tabId: tabId
    });
    
    chrome.action.setTitle({
      title: "Stay Awake Pro - غير مفعل، انقر للتفعيل",
      tabId: tabId
    });
    
    console.log(`⛔ تم إيقاف تفعيل الصفحة: ${url}`);
  }
}

// تفعيل جميع الصفحات
async function activateAllTabs() {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.url && tab.url.startsWith('http')) {
      activateTab(tab.id);
    }
  }
}

// حفظ الإعدادات عند إغلاق المتصفح
chrome.runtime.onSuspend.addListener(() => {
  if (settings.saveState) {
    chrome.storage.local.set({ activeTabsMap });
    console.log("تم حفظ حالات الصفحات قبل الإغلاق");
  }
});