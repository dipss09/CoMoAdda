// ──────────────────────────────────────────────
//  🔥  FIREBASE CONFIGURATION 
// ──────────────────────────────────────────────
const firebaseConfig = {
  apiKey: ["AIzaSyD5", "jNH16Xkz", "rq6prfqtx", "Oa10HbqEy", "BPm44"].join(""),
  authDomain: "brewdipu-f2092.firebaseapp.com",
  projectId: "brewdipu-f2092",
  storageBucket: "brewdipu-f2092.appspot.com",
  messagingSenderId: "959585483776",
  appId: "1:959585483776:web:65fec5ade570d763546ce5"
};

// Initialize Firebase
try {
  firebase.initializeApp(firebaseConfig);
} catch(e) {
  console.error("Firebase init failed:", e);
}

const db = firebase.firestore();
db.enablePersistence().catch(function(err) {
  console.warn("Firebase persistence error:", err);
});
const auth = firebase.auth();
const storage = firebase.storage();

// No hardcoded PRODUCTS array anymore. All driven via Firestore.
// ──────────────────────────────────────────────
//  🔐  AUTH LOGIC
// ──────────────────────────────────────────────
let adminLoaded = false;
auth.onAuthStateChanged((user) => {
  const loginScreen = document.getElementById("login-screen");
  const appScreen = document.getElementById("app-screen");
  if (user) {
    loginScreen.classList.add("hidden");
    appScreen.classList.remove("hidden");
    if(!adminLoaded) {
        loadSettings();
        loadOrders();
        loadUsers();
        loadReferrals();
        loadProducts();
        loadOffers();
        loadReviews();
        adminLoaded = true;
    }
  } else {
    loginScreen.classList.remove("hidden");
    appScreen.classList.add("hidden");
    adminLoaded = false; // Reset if logged out
  }
});

document.getElementById("login-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const email = document.getElementById("login-email").value;
  const pass = document.getElementById("login-password").value;
  const errEl = document.getElementById("login-error");
  errEl.classList.add("hidden");
  
  auth.signInWithEmailAndPassword(email, pass).catch(err => {
    errEl.textContent = err.message;
    errEl.classList.remove("hidden");
  });
});

document.getElementById("logout-btn").addEventListener("click", () => {
  auth.signOut();
});

// ──────────────────────────────────────────────
//  👉  TAB NAVIGATION
// ──────────────────────────────────────────────
function switchTab(tabId) {
  const tabs = ['orders', 'sales', 'products', 'reviews', 'users', 'settings', 'offers', 'popups', 'spinwin'];
  tabs.forEach(t => {
    document.getElementById(`tab-${t}`).classList.add("hidden");
    const btn = document.getElementById(`tab-btn-${t}`);
    if(btn) {
      btn.classList.remove("bg-primary", "text-white");
      btn.classList.add("text-on-surface-variant", "hover:bg-surface-container-highest");
      btn.style.backgroundColor = "";
      btn.style.color = "";
    }
  });
  
  document.getElementById(`tab-${tabId}`).classList.remove("hidden");
  const activeBtn = document.getElementById(`tab-btn-${tabId}`);
  if(activeBtn) {
    activeBtn.classList.add("bg-primary", "text-white");
    activeBtn.classList.remove("text-on-surface-variant", "hover:bg-surface-container-highest");
  }
}

// ──────────────────────────────────────────────
//  📋  ORDERS MANAGEMENT
// ──────────────────────────────────────────────
function loadOrders() {
  db.collection("orders").orderBy("timestamp", "desc").onSnapshot(snapshot => {
    const tbody = document.getElementById("orders-tbody");
    let productSales = {};

    if(snapshot.empty) {
      tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-on-surface-variant">No orders yet.</td></tr>`;
      const salesGrid = document.getElementById("product-sales-grid");
      if (salesGrid) salesGrid.innerHTML = `<div class="col-span-full text-on-surface-variant">No sales data.</div>`;
      return;
    }

    let html = "";
    snapshot.forEach(doc => {
      const data = doc.data();
      const st = data.status || "Pending";
      let badgeColor = "bg-gray-100 text-gray-800";
      if (st === "Pending") badgeColor = "bg-red-100 text-red-800";
      else if (st === "Confirmed") badgeColor = "bg-orange-100 text-orange-800";
      else if (st === "Delivered") badgeColor = "bg-green-100 text-green-800";
      
      const itemsList = data.items ? data.items.map(i => `${i.qty}x ${i.name}`).join("<br/>") : "-";

      html += `
      <tr class="hover:bg-surface-container transition-colors">
        <td class="p-4 text-sm font-bold">${data.timeString}</td>
        <td class="p-4"><span class="font-bold">${data.name}</span><br/><span class="text-xs text-on-surface-variant">${data.address}</span></td>
        <td class="p-4 text-sm">${data.phone}<br/>${data.email}</td>
        <td class="p-4 text-sm">${itemsList}<br/><span class="font-black mt-1 inline-block">₹${data.total}</span></td>
        <td class="p-4"><span class="px-3 py-1 rounded-full text-xs font-bold ${badgeColor}">${st}</span></td>
        <td class="p-4">
          <select onchange="updateOrderStatus('${doc.id}', this.value)" class="text-sm p-2 rounded border border-outline/20">
            <option value="Pending" ${st==='Pending'?'selected':''}>Pending</option>
            <option value="Confirmed" ${st==='Confirmed'?'selected':''}>Confirmed</option>
            <option value="Delivered" ${st==='Delivered'?'selected':''}>Delivered</option>
            <option value="Cancelled" ${st==='Cancelled'?'selected':''}>Cancelled</option>
          </select>
        </td>
      </tr>`;

      if (st === "Delivered" && data.items) {
        data.items.forEach(item => {
          if (!productSales[item.name]) productSales[item.name] = 0;
          productSales[item.name] += parseInt(item.qty, 10);
        });
      }
    });
    tbody.innerHTML = html;

    const salesGrid = document.getElementById("product-sales-grid");
    if (salesGrid) {
      let salesHtml = "";
      const sortedSales = Object.keys(productSales).sort((a, b) => productSales[b] - productSales[a]);
      if (sortedSales.length === 0) {
        salesHtml = `<div class="col-span-full text-on-surface-variant">No delivered items yet.</div>`;
      } else {
        sortedSales.forEach(name => {
          salesHtml += `
            <div class="p-4 bg-white rounded-xl border border-outline/20 shadow-sm flex flex-col">
              <span class="text-xs text-on-surface-variant mb-1 line-clamp-1" title="${name}">${name}</span>
              <span class="text-lg font-black text-primary">${productSales[name]} sold</span>
            </div>
          `;
        });
      }
      salesGrid.innerHTML = salesHtml;
    }
  }, error => {
    console.error("Firestore orders query failed:", error);
    const tbody = document.getElementById("orders-tbody");
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-red-600 font-bold">Error loading orders: ${error.message}. Check browser console or Firebase rules.</td></tr>`;
    }
  });
}

window.updateOrderStatus = function(id, newStatus) {
  db.collection("orders").doc(id).update({ status: newStatus }).then(() => {
    if (newStatus === "Delivered") {
      db.collection("orders").doc(id).get().then(orderDoc => {
        const orderData = orderDoc.data();
        if (orderData && orderData.total > 50) {
          db.collection("referrals").where("orderId", "==", id).get().then(snap => {
            snap.forEach(doc => {
              const data = doc.data();
              if (data.status === "Pending") {
                doc.ref.update({ status: "Earned" });
                db.collection("users").doc(data.referrerUid).update({
                  points: firebase.firestore.FieldValue.increment(data.points),
                  referralCount: firebase.firestore.FieldValue.increment(1)
                });
              }
            });
          });
        } else {
          db.collection("referrals").where("orderId", "==", id).get().then(snap => {
            snap.forEach(doc => {
              if (doc.data().status === "Pending") {
                doc.ref.update({ status: "Failed (Order <= 50)" });
              }
            });
          });
        }
      });
    } else if (newStatus === "Cancelled") {
      db.collection("referrals").where("orderId", "==", id).get().then(snap => {
        snap.forEach(doc => {
          if (doc.data().status === "Pending") {
            doc.ref.update({ status: "Failed (Cancelled)" });
          }
        });
      });
    }
  });
};

// ──────────────────────────────────────────────
//  👥  USERS & REFERRALS MANAGEMENT
// ──────────────────────────────────────────────
function loadUsers() {
  db.collection("users").orderBy("createdAt", "desc").onSnapshot(snapshot => {
    const tbody = document.getElementById("users-tbody");
    if(snapshot.empty) {
      tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-on-surface-variant">No users found.</td></tr>`;
      return;
    }

    let html = "";
    snapshot.forEach(doc => {
      const data = doc.data();
      const code = data.referralCode || "NONE";
      const pts = data.points || 0;
      const refCount = data.referralCount || 0;

      html += `
      <tr class="hover:bg-surface-container transition-colors">
        <td class="p-4"><span class="font-bold">${data.name || 'Anonymous'}</span><br/><span class="text-xs text-on-surface-variant">${data.address || 'No address'}</span></td>
        <td class="p-4 text-sm">${data.phone || '-'}<br/>${data.email || '-'}</td>
        <td class="p-4 text-sm font-mono font-bold text-secondary tracking-widest">${code}</td>
        <td class="p-4 text-sm font-black">${refCount}</td>
        <td class="p-4"><span class="px-3 py-1 bg-primary/10 text-primary font-black rounded-full">${pts}</span></td>
        <td class="p-4">
          <div class="flex gap-2">
            <button onclick="updateUserPoints('${doc.id}', 100)" class="p-2 bg-surface-container-high rounded border hover:bg-green-100 items-center justify-center flex" title="Add 100 Points"><span class="material-symbols-outlined text-sm">add</span></button>
            <button onclick="updateUserPoints('${doc.id}', -100)" class="p-2 bg-surface-container-high rounded border hover:bg-red-100 items-center justify-center flex" title="Deduct 100 Points"><span class="material-symbols-outlined text-sm">remove</span></button>
            <button onclick="updateUserPoints('${doc.id}', 'reset')" class="p-2 bg-surface-container-high rounded border hover:bg-red-50 text-error items-center justify-center flex" title="Reset to 0"><span class="material-symbols-outlined text-sm">restart_alt</span></button>
          </div>
        </td>
      </tr>`;
    });
    tbody.innerHTML = html;
  }, error => {
    console.error("Firestore users query failed:", error);
    const tbody = document.getElementById("users-tbody");
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-red-600 font-bold">Error loading users: ${error.message}</td></tr>`;
    }
  });
}

function loadReferrals() {
  db.collection("referrals").orderBy("timestamp", "desc").onSnapshot(snapshot => {
    const tbody = document.getElementById("referrals-tbody");
    if(!tbody) return;
    if(snapshot.empty) {
      tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-on-surface-variant">No referrals found.</td></tr>`;
      return;
    }

    let html = "";
    snapshot.forEach(doc => {
      const data = doc.data();
      const st = data.status || "Pending";
      const badgeColor = st === "Pending" ? "bg-orange-100 text-orange-800" : "bg-green-100 text-green-800";
      
      html += `
      <tr class="hover:bg-surface-container transition-colors">
        <td class="p-4 text-sm font-bold font-mono tracking-widest">${data.referrerUid}</td>
        <td class="p-4 text-sm">${data.refereeName}</td>
        <td class="p-4 text-sm font-mono text-on-surface-variant">${data.orderId}</td>
        <td class="p-4 font-black text-secondary">${data.points}</td>
        <td class="p-4"><span class="px-3 py-1 rounded-full text-xs font-bold ${badgeColor}">${st}</span></td>
      </tr>`;
    });
    tbody.innerHTML = html;
  }, error => {
    console.error("Firestore referrals query failed:", error);
    const tbody = document.getElementById("referrals-tbody");
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-red-600 font-bold">Error loading referrals: ${error.message}</td></tr>`;
    }
  });
}

window.updateUserPoints = function(uid, amount) {
   if(amount === 'reset') {
      if(confirm("Are you sure you want to completely reset this user's points to 0?")) {
          db.collection("users").doc(uid).update({ points: 0 });
      }
   } else {
      let change = parseInt(amount);
      if(confirm(`Adjust points by ${change}?`)) {
          db.collection("users").doc(uid).update({ 
               points: firebase.firestore.FieldValue.increment(change)
          }).then(() => {
              // Ensure we don't go below 0 visually by next snapshot, but we can also prevent it here:
              db.collection("users").doc(uid).get().then(doc => {
                 if(doc.data().points < 0) doc.ref.update({points: 0});
              });
          });
      }
   }
};

// ──────────────────────────────────────────────
//  ⚙️  STORE SETTINGS (Timing & About)
// ──────────────────────────────────────────────
const autoliveCheckbox = document.getElementById("set-autolive");
const manualOverride = document.getElementById("manual-override-container");

autoliveCheckbox.addEventListener("change", (e) => {
  if(e.target.checked) manualOverride.classList.add("hidden", "opacity-50");
  else manualOverride.classList.remove("hidden", "opacity-50");
});

let currentSettings = {};

function loadSettings() {
  db.collection("settings").doc("storeConfig").onSnapshot(doc => {
    if (doc.exists) {
      currentSettings = doc.data();
      const data = currentSettings;
      document.getElementById("set-reward-points").value = data.rewardPointsRequired || 600;
      document.getElementById("set-about").value = data.aboutText || "";
      document.getElementById("set-hero-title").value = data.heroTitle || "CoMoAdda";
      document.getElementById("set-hero-sub").value = data.heroSub || "Chilled Sips, Crafted by Dipu.";
      document.getElementById("set-story-heading").value = data.storyHeading || "Artisanal Sips,\nBorn at Home.";
      // Note: set-story-file is an input type="file", we can't set its value.
      
      
      // Contact & Social
      document.getElementById("set-whatsapp").value = data.whatsapp || "918101244865";
      document.getElementById("set-email").value = data.email || "comoadda@gmail.com";
      document.getElementById("set-instagram").value = data.instagram || "https://www.instagram.com/comoadda";
      
      // EmailJS
      if (data.emailjs) {
        document.getElementById("set-emailjs-public").value = data.emailjs.publicKey || "";
        document.getElementById("set-emailjs-service").value = data.emailjs.serviceId || "";
        document.getElementById("set-emailjs-template").value = data.emailjs.templateId || "";
      }
      
      // Features (Why CoMoAdda)
      if (data.features) {
        document.getElementById("set-f1-title").value = data.features.f1Title || "Homemade Pureness";
        document.getElementById("set-f1-desc").value = data.features.f1Desc || "Zero preservatives. Just raw, natural ingredients prepared in small batches to ensure absolute quality in every sip.";
        document.getElementById("set-f2-title").value = data.features.f2Title || "Always Fresh";
        document.getElementById("set-f2-desc").value = data.features.f2Desc || "Small batches. Made to order for peak flavor profile.";
        document.getElementById("set-f3-title").value = data.features.f3Title || "Affordable Luxury";
        document.getElementById("set-f3-desc").value = data.features.f3Desc || "High-end cafe experience delivered fresh to your door at honest prices.";
        document.getElementById("set-f4-title").value = data.features.f4Title || "Local Delivery";
        document.getElementById("set-f4-desc").value = data.features.f4Desc || "Every order supports a local artisan and a dream of crafting better coffee for everyone.";
      }

      // Popup Notification
      if (data.popup) {
         document.getElementById("set-popup-enable").checked = !!data.popup.enabled;
         document.getElementById("set-popup-title").value = data.popup.title || "";
         document.getElementById("set-popup-message").value = data.popup.message || "";
         document.getElementById("set-popup-btn-text").value = data.popup.btnText || "";
         document.getElementById("set-popup-btn-link").value = data.popup.btnLink || "";
         document.getElementById("set-popup-delay").value = data.popup.delay !== undefined ? data.popup.delay : 3;
         document.getElementById("set-popup-promo-code").value = data.popup.promoCode || "";
         // Show current image preview
         if (data.popup.media) {
           const wrap = document.getElementById("popup-media-preview-wrap");
           const img = document.getElementById("popup-media-current");
           if (wrap && img) { img.src = data.popup.media; wrap.classList.remove("hidden"); }
         }
      }

      // Spin & Win
      if (data.spinWheel) {
         document.getElementById("set-spin-enable").checked = !!data.spinWheel.enabled;
         document.getElementById("set-spin-rewards").value = data.spinWheel.rewards || "";
         document.getElementById("set-spin-cta").value = data.spinWheel.ctaText || "Spin to Get Offer!";
         document.getElementById("set-spin-insta-link").value = data.spinWheel.instaLink || "";
         document.getElementById("set-spin-popup-delay").value = data.spinWheel.popupDelay != null ? data.spinWheel.popupDelay : 3;
         if (data.spinWheel.wheelImg) {
           const wrap = document.getElementById("spin-img-preview-wrap");
           const img = document.getElementById("spin-img-current");
           if (wrap && img) { img.src = data.spinWheel.wheelImg; wrap.classList.remove("hidden"); }
         }
      }

      // Collections — dynamic array
      if (data.collectionsData && data.collectionsData.length) {
        renderCollectionRows(data.collectionsData);
      } else if (data.collections) {
        // Backward compat: convert old c1..c4 keys to array
        const legacyArr = [];
        for (let i = 1; i <= 4; i++) {
          const t = data.collections['c'+i+'Title'];
          const s = data.collections['c'+i+'Sub'];
          const img = data.collectionsImg ? (data.collectionsImg[i-1] || '') : '';
          if (t) legacyArr.push({ title: t, sub: s || '', img: img });
        }
        renderCollectionRows(legacyArr);
      } else {
        renderCollectionRows([]);
      }

      renderCustomizationRows(data.customizationsData || []);

      if(data.schedule) {
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        days.forEach(day => {
          if (data.schedule[day]) {
            document.getElementById(`${day.toLowerCase()}-open`).value = data.schedule[day].open || "09:00";
            document.getElementById(`${day.toLowerCase()}-close`).value = data.schedule[day].close || "22:00";
            document.getElementById(`${day.toLowerCase()}-closed`).checked = !!data.schedule[day].closedAllDay;
            if(data.schedule[day].closedAllDay) {
                document.getElementById(`${day.toLowerCase()}-open`).disabled = true;
                document.getElementById(`${day.toLowerCase()}-close`).disabled = true;
            } else {
                document.getElementById(`${day.toLowerCase()}-open`).disabled = false;
                document.getElementById(`${day.toLowerCase()}-close`).disabled = false;
            }
          }
        });
      }

      document.getElementById("set-autolive").checked = !!data.autoLive;
      document.getElementById("set-isopen").checked = !!data.isOpen;
      
      if(data.autoLive) manualOverride.classList.add("hidden", "opacity-50");
      else manualOverride.classList.remove("hidden", "opacity-50");
    }
  }, error => {
    console.error("Firestore settings query failed:", error);
    alert("❌ Error loading settings from Firestore: " + error.message);
  });
}

document.getElementById("settings-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const submitBtn = e.target.querySelector("button[type='submit']");
  const btnOrigHTML = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-base">progress_activity</span> Saving...';

  try {
    // Helper: safely read time input — returns fallback if empty or invalid (browser compat fix)
    const getTime = (id, fallback) => {
      const el = document.getElementById(id);
      const val = el ? el.value : '';
      return /^\d{2}:\d{2}$/.test(val) ? val : fallback;
    };

    const schedule = {
      Sun: { open: getTime("sun-open", "09:00"), close: getTime("sun-close", "22:00"), closedAllDay: document.getElementById("sun-closed").checked },
      Mon: { open: getTime("mon-open", "09:00"), close: getTime("mon-close", "22:00"), closedAllDay: document.getElementById("mon-closed").checked },
      Tue: { open: getTime("tue-open", "09:00"), close: getTime("tue-close", "22:00"), closedAllDay: document.getElementById("tue-closed").checked },
      Wed: { open: getTime("wed-open", "09:00"), close: getTime("wed-close", "22:00"), closedAllDay: document.getElementById("wed-closed").checked },
      Thu: { open: getTime("thu-open", "09:00"), close: getTime("thu-close", "22:00"), closedAllDay: document.getElementById("thu-closed").checked },
      Fri: { open: getTime("fri-open", "09:00"), close: getTime("fri-close", "22:00"), closedAllDay: document.getElementById("fri-closed").checked },
      Sat: { open: getTime("sat-open", "09:00"), close: getTime("sat-close", "22:00"), closedAllDay: document.getElementById("sat-closed").checked },
    };

    // Image Upload Processing
    const filePromises = [];
    
    // Process Story Image
    const storyFileEl = document.getElementById("set-story-file");
    let finalStoryImg = currentSettings.storyImg || "";
    if(storyFileEl && storyFileEl.files[0]) {
       filePromises.push(compressAndGetBase64(storyFileEl.files[0]).then(url => finalStoryImg = url));
    }

    // Process Insta Gallery (safely — elements may not exist if section was removed)
    let finalInstaGallery = currentSettings.instaGallery ? [...currentSettings.instaGallery] : [];
    for(let i=1; i<=6; i++) {
       const el = document.getElementById(`set-ig-${i}`);
       if(el && el.files && el.files[0]) {
          filePromises.push(compressAndGetBase64(el.files[0]).then(url => { while(finalInstaGallery.length < i) finalInstaGallery.push(''); finalInstaGallery[i-1] = url; }));
       }
    }

    // Process Collection Images (dynamic)
    const collectionRows = document.querySelectorAll('#collections-list .collec-row');
    let finalCollectionsData = currentSettings.collectionsData ? JSON.parse(JSON.stringify(currentSettings.collectionsData)) : [];
    while (finalCollectionsData.length < collectionRows.length) finalCollectionsData.push({ title: '', target: '', sub: '', img: '' });
    finalCollectionsData = finalCollectionsData.slice(0, collectionRows.length);

    collectionRows.forEach((row, idx) => {
      finalCollectionsData[idx].title = row.querySelector('.collec-title').value;
      finalCollectionsData[idx].target = row.querySelector('.collec-target').value;
      finalCollectionsData[idx].sub   = row.querySelector('.collec-sub').value;
      const imgFile = row.querySelector('.collec-img-file');
      if (imgFile && imgFile.files[0]) {
        filePromises.push(compressAndGetBase64(imgFile.files[0]).then(url => finalCollectionsData[idx].img = url));
      }
    });

    // Process Customizations Data
    const customizationRows = document.querySelectorAll('#customizations-list .customization-row');
    let finalCustomizationsData = [];
    customizationRows.forEach((row) => {
      const name = row.querySelector('.cust-name').value.trim();
      const price = row.querySelector('.cust-price').value.trim();
      if (name) {
        finalCustomizationsData.push({ name: name, price: price ? Number(price) : 0 });
      }
    });

    // Process images if any
    if(filePromises.length > 0) {
       submitBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-base">progress_activity</span> Uploading images...';
       await Promise.all(filePromises);
    }

    const payload = {
      heroTitle: document.getElementById("set-hero-title").value,
      heroSub: document.getElementById("set-hero-sub").value,
      storyHeading: document.getElementById("set-story-heading").value,
      storyImg: finalStoryImg,
      instaGallery: finalInstaGallery,
      aboutText: document.getElementById("set-about").value,
      whatsapp: document.getElementById("set-whatsapp").value,
      email: document.getElementById("set-email").value,
      instagram: document.getElementById("set-instagram").value,
      emailjs: {
         publicKey: document.getElementById("set-emailjs-public").value,
         serviceId: document.getElementById("set-emailjs-service").value,
         templateId: document.getElementById("set-emailjs-template").value,
      },
      rewardPointsRequired: parseInt(document.getElementById("set-reward-points").value) || 600,
      features: {
         f1Title: document.getElementById("set-f1-title").value,
         f1Desc: document.getElementById("set-f1-desc").value,
         f2Title: document.getElementById("set-f2-title").value,
         f2Desc: document.getElementById("set-f2-desc").value,
         f3Title: document.getElementById("set-f3-title").value,
         f3Desc: document.getElementById("set-f3-desc").value,
         f4Title: document.getElementById("set-f4-title").value,
         f4Desc: document.getElementById("set-f4-desc").value,
      },
      collectionsData: finalCollectionsData,
      customizationsData: finalCustomizationsData,
      schedule: schedule,
      autoLive: document.getElementById("set-autolive").checked,
      isOpen: document.getElementById("set-isopen").checked,
    };
    
    // Save to Firestore (strip undefined values)
    const sanitizedPayload = JSON.parse(JSON.stringify(payload));
    submitBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-base">progress_activity</span> Applying to website...';
    await db.collection("settings").doc("storeConfig").set(sanitizedPayload, { merge: true });

    // SUCCESS
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span class="material-symbols-outlined text-base">check_circle</span> Saved Successfully!';
    submitBtn.classList.remove("bg-primary");
    submitBtn.classList.add("bg-green-600");
    
    const msg = document.getElementById("settings-msg");
    msg.classList.remove("hidden");
    
    // Clear file inputs after success
    if(storyFileEl) storyFileEl.value = "";
    document.querySelectorAll('#collections-list .collec-img-file').forEach(f => f.value = '');
    
    setTimeout(() => {
      msg.classList.add("hidden");
      submitBtn.innerHTML = btnOrigHTML;
      submitBtn.classList.add("bg-primary");
      submitBtn.classList.remove("bg-green-600");
    }, 3000);

  } catch (err) {
    console.error("Settings save error:", err);
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span class="material-symbols-outlined text-base">error</span> Save Failed — Try Again';
    submitBtn.classList.remove("bg-primary");
    submitBtn.classList.add("bg-red-600");
    alert("❌ Failed to save settings!\n\nError: " + (err.message || err) + "\n\nPlease check your internet connection and try again.");
    setTimeout(() => {
      submitBtn.innerHTML = btnOrigHTML;
      submitBtn.classList.add("bg-primary");
      submitBtn.classList.remove("bg-red-600");
    }, 4000);
  }
});

// ──────────────────────────────────────────────
//  🎁  OFFERS / PROMOTIONS FORM HANDLER
// ──────────────────────────────────────────────
// ── POPUP-ONLY FORM (Popups tab) ─────────────
document.getElementById("popups-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const submitBtn = e.target.querySelector("button[type='submit']");
  const btnOrigHTML = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-base">progress_activity</span> Saving...';

  try {
    let finalPopupMedia = currentSettings.popup ? (currentSettings.popup.media || "") : "";
    const mediaFileInput = document.getElementById("set-popup-media-file");

    if (mediaFileInput && mediaFileInput.files[0]) {
      submitBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-base">progress_activity</span> Uploading media...';
      finalPopupMedia = await compressAndGetBase64(mediaFileInput.files[0]);
    }

    const payload = {
      popup: {
        enabled: document.getElementById("set-popup-enable").checked,
        title: document.getElementById("set-popup-title").value,
        media: finalPopupMedia,
        message: document.getElementById("set-popup-message").value,
        btnText: document.getElementById("set-popup-btn-text").value,
        btnLink: document.getElementById("set-popup-btn-link").value,
        delay: parseInt(document.getElementById("set-popup-delay").value) || 0,
        promoCode: document.getElementById("set-popup-promo-code").value.toUpperCase().trim(),
      },
    };

    submitBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-base">progress_activity</span> Applying...';
    await db.collection("settings").doc("storeConfig").set(payload, { merge: true });

    // SUCCESS
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span class="material-symbols-outlined text-base">check_circle</span> Saved!';
    submitBtn.classList.remove("bg-primary"); submitBtn.classList.add("bg-green-600");
    const msg = document.getElementById("popups-msg");
    msg.classList.remove("hidden");
    if (mediaFileInput) mediaFileInput.value = "";
    setTimeout(() => { msg.classList.add("hidden"); submitBtn.innerHTML = btnOrigHTML; submitBtn.classList.add("bg-primary"); submitBtn.classList.remove("bg-green-600"); }, 3000);

  } catch (err) {
    console.error("Popup save error:", err);
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span class="material-symbols-outlined text-base">error</span> Failed — Try Again';
    submitBtn.classList.remove("bg-primary"); submitBtn.classList.add("bg-red-600");
    alert("❌ Failed to save popup settings!\n\nError: " + (err.message || err));
    setTimeout(() => { submitBtn.innerHTML = btnOrigHTML; submitBtn.classList.add("bg-primary"); submitBtn.classList.remove("bg-red-600"); }, 4000);
  }
});

// ── SPIN & WIN FORM (own tab) ───────────────────────────
document.getElementById("spinwin-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const submitBtn = e.target.querySelector("button[type='submit']");
  const btnOrigHTML = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-base">progress_activity</span> Saving...';

  try {
    let finalWheelImg = currentSettings.spinWheel ? (currentSettings.spinWheel.wheelImg || "") : "";
    const wheelImgInput = document.getElementById("set-spin-wheel-img");

    if (wheelImgInput && wheelImgInput.files[0]) {
      submitBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-base">progress_activity</span> Uploading wheel image...';
      finalWheelImg = await compressAndGetBase64(wheelImgInput.files[0], 600);
    }

    const payload = {
      spinWheel: {
        enabled: document.getElementById("set-spin-enable").checked,
        rewards: document.getElementById("set-spin-rewards").value,
        ctaText: document.getElementById("set-spin-cta").value || "Spin to Get Offer!",
        wheelImg: finalWheelImg,
        instaLink: document.getElementById("set-spin-insta-link").value.trim(),
        popupDelay: parseInt(document.getElementById("set-spin-popup-delay").value) || 0,
      },
    };

    submitBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-base">progress_activity</span> Applying...';
    await db.collection("settings").doc("storeConfig").set(payload, { merge: true });

    // SUCCESS
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span class="material-symbols-outlined text-base">check_circle</span> Saved!';
    submitBtn.classList.remove("bg-primary"); submitBtn.classList.add("bg-green-600");
    const msg = document.getElementById("spinwin-msg");
    msg.classList.remove("hidden");
    if (wheelImgInput) wheelImgInput.value = "";
    setTimeout(() => { msg.classList.add("hidden"); submitBtn.innerHTML = btnOrigHTML; submitBtn.classList.add("bg-primary"); submitBtn.classList.remove("bg-green-600"); }, 3000);

  } catch (err) {
    console.error("Spin & Win save error:", err);
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span class="material-symbols-outlined text-base">error</span> Failed — Try Again';
    submitBtn.classList.remove("bg-primary"); submitBtn.classList.add("bg-red-600");
    alert("❌ Failed to save Spin & Win settings!\n\nError: " + (err.message || err));
    setTimeout(() => { submitBtn.innerHTML = btnOrigHTML; submitBtn.classList.add("bg-primary"); submitBtn.classList.remove("bg-red-600"); }, 4000);
  }
});

// ── Dynamic Collections Helpers ──────────────────────────────────
window.addCollectionRow = function(data = {}) {
  const list = document.getElementById('collections-list');
  const idx = list.querySelectorAll('.collec-row').length + 1;
  const div = document.createElement('div');
  div.className = 'collec-row p-4 bg-surface-container-low rounded-2xl border border-outline/10 flex flex-col gap-2 relative';
  div.innerHTML = `
    <div class="flex justify-between items-center mb-1">
      <span class="text-xs text-primary font-bold">Collection ${idx}</span>
      <button type="button" onclick="this.closest('.collec-row').remove(); renumberCollectionRows()" class="text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-1">
        <span class="material-symbols-outlined text-sm">delete</span> Remove
      </button>
    </div>
    <input type="text" class="collec-title w-full bg-white rounded-xl p-3 text-sm border border-outline/20" placeholder="e.g. Cold Coffee" value="${data.title||''}">
    <input type="text" class="collec-target w-full bg-white rounded-xl p-3 text-sm border border-outline/20" placeholder="Target Category (must match product category exactly)" value="${data.target||''}" list="categories-datalist">
    <p class="text-[10px] text-amber-600 -mt-1">⚠️ Must match a product category name exactly (e.g. "Corn Chaat", not "Corn Chart")</p>
    <input type="text" class="collec-sub w-full bg-white rounded-xl p-3 text-sm border border-outline/20" placeholder="e.g. Brewed for 18 hours" value="${data.sub||''}">
    ${data.img ? `<img src="${data.img}" class="w-16 h-16 object-cover rounded-lg border border-outline/20 mb-1">` : ''}
    <input type="file" class="collec-img-file w-full bg-surface-container-lowest rounded-xl p-2 border border-outline/10 text-xs" accept="image/*">
  `;
  list.appendChild(div);
};

window.renumberCollectionRows = function() {
  document.querySelectorAll('#collections-list .collec-row').forEach((row, i) => {
    const label = row.querySelector('span.text-primary');
    if (label) label.textContent = 'Collection ' + (i + 1);
  });
};

function renderCollectionRows(dataArr) {
  const list = document.getElementById('collections-list');
  list.innerHTML = '';
  if (!dataArr || dataArr.length === 0) {
    // Default 4 empty rows
    for (let i = 0; i < 4; i++) addCollectionRow();
    return;
  }
  dataArr.forEach(item => addCollectionRow(item));
}

// ── Dynamic Customizations Helpers ──────────────────────────────────
window.addCustomizationRow = function(data = {}) {
  const list = document.getElementById('customizations-list');
  const idx = list.querySelectorAll('.customization-row').length + 1;
  const div = document.createElement('div');
  div.className = 'customization-row p-4 bg-surface-container-low rounded-2xl border border-outline/10 flex flex-col gap-2 relative';
  div.innerHTML = `
    <div class="flex justify-between items-center mb-1">
      <span class="text-xs text-primary font-bold">Option ${idx}</span>
      <button type="button" onclick="this.closest('.customization-row').remove(); renumberCustomizationRows()" class="text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-1">
        <span class="material-symbols-outlined text-sm">delete</span> Remove
      </button>
    </div>
    <div class="flex gap-2">
      <input type="text" class="cust-name flex-1 bg-white rounded-xl p-3 text-sm border border-outline/20" placeholder="e.g. Extra Ice" value="${data.name||''}">
      <input type="number" class="cust-price w-24 bg-white rounded-xl p-3 text-sm border border-outline/20" placeholder="Price (₹)" value="${data.price !== undefined ? data.price : ''}">
    </div>
  `;
  list.appendChild(div);
};

window.renumberCustomizationRows = function() {
  document.querySelectorAll('#customizations-list .customization-row').forEach((row, i) => {
    const label = row.querySelector('span.text-primary');
    if (label) label.textContent = 'Option ' + (i + 1);
  });
};

function renderCustomizationRows(dataArr) {
  const list = document.getElementById('customizations-list');
  list.innerHTML = '';
  if (!dataArr || dataArr.length === 0) {
    // Default 1 empty row
    addCustomizationRow();
    return;
  }
  dataArr.forEach(item => addCustomizationRow(item));
}

// ──────────────────────────────────────────────
//  🚀  IMAGE UPLOAD & COMPRESSION Helper (Firebase Storage)
// ──────────────────────────────────────────────
function compressAndGetBase64(file, maxWidth = 800) {
  return new Promise((resolve, reject) => {
    let done = false;
    const finish = (fn, val) => { if (!done) { done = true; fn(val); } };

    // SAFETY: 20-second global timeout → fall back to base64 data URL
    const globalTimeout = setTimeout(() => {
      console.warn('[Upload] Global timeout for', file.name, '— using base64 fallback');
      // Read file as base64 directly as last resort
      const r = new FileReader();
      r.onload = (ev) => finish(resolve, ev.target.result);
      r.onerror = () => finish(reject, 'Timeout + file read failed');
      r.readAsDataURL(file);
    }, 20000);

    const ok = (val) => { clearTimeout(globalTimeout); finish(resolve, val); };
    const fail = (err) => { clearTimeout(globalTimeout); finish(reject, err); };

    const fileType = file.type || '';
    const isGif = fileType === 'image/gif';
    const isVideo = fileType.startsWith('video/');

    // GIFs and videos: try Firebase Storage, fallback to base64
    if (isGif || isVideo) {
      try {
        const ext = isGif ? 'gif' : (file.name.split('.').pop() || 'mp4');
        const fileName = 'uploads/' + Date.now() + '_' + Math.random().toString(36).substring(2) + '.' + ext;
        const ref = storage.ref().child(fileName);
        const task = ref.put(file);
        const uploadTimeout = setTimeout(() => {
          console.warn('[Upload] Storage timeout for GIF/video, using base64');
          const r2 = new FileReader();
          r2.onload = (ev) => ok(ev.target.result);
          r2.onerror = () => fail('File read failed');
          r2.readAsDataURL(file);
        }, 12000);
        task.on('state_changed', null,
          (err) => { clearTimeout(uploadTimeout); console.warn('[Upload] Storage error:', err); const r3 = new FileReader(); r3.onload = (ev) => ok(ev.target.result); r3.readAsDataURL(file); },
          () => { clearTimeout(uploadTimeout); task.snapshot.ref.getDownloadURL().then(ok).catch(fail); }
        );
      } catch(e) {
        const r4 = new FileReader();
        r4.onload = (ev) => ok(ev.target.result);
        r4.readAsDataURL(file);
      }
      return;
    }

    // Standard images: compress via canvas, then try Storage with fallback
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = event => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (w > h && w > maxWidth) { h *= maxWidth / w; w = maxWidth; }
        else if (h > maxWidth) { w *= maxWidth / h; h = maxWidth; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);

        // Get base64 immediately as our fallback
        const base64Fallback = canvas.toDataURL('image/jpeg', 0.65);

        canvas.toBlob((blob) => {
          if (!blob) return ok(base64Fallback);
          try {
            const fileName = 'uploads/' + Date.now() + '_' + Math.random().toString(36).substring(2) + '.jpg';
            const ref = storage.ref().child(fileName);
            const task = ref.put(blob);
            // 12-second upload timeout → use base64 fallback
            const uploadTimeout = setTimeout(() => {
              console.warn('[Upload] Storage upload timeout for', file.name, '— using base64');
              ok(base64Fallback);
            }, 12000);
            task.on('state_changed', null,
              (err) => { clearTimeout(uploadTimeout); console.warn('[Upload] Storage error, using base64:', err); ok(base64Fallback); },
              () => { clearTimeout(uploadTimeout); task.snapshot.ref.getDownloadURL().then(ok).catch(() => ok(base64Fallback)); }
            );
          } catch(e) { ok(base64Fallback); }
        }, 'image/jpeg', 0.7);
      };
      img.onerror = () => fail('Image processing failed for ' + file.name);
    };
    reader.onerror = () => fail('File reading failed for ' + file.name);
  });
}

// ──────────────────────────────────────────────
//  📦  PRODUCT CRUD (Replaces Inventory)
// ──────────────────────────────────────────────
let currentProducts = [];

function loadProducts() {
  db.collection("products").onSnapshot(snapshot => {
    const grid = document.getElementById("products-grid");
    currentProducts = [];
    let html = "";
    snapshot.forEach(doc => {
      const p = doc.data();
      p.id = doc.id;
      currentProducts.push(p);
      const isAvail = !p.outOfStock;
      
      html += `
      <div class="glass-card p-6 rounded-2xl flex flex-col justify-between h-full bg-white relative group">
        <div class="relative w-full h-40 rounded-xl overflow-hidden mb-4">
          <img src="${p.img}" class="w-full h-full object-contain bg-surface-container">
        </div>
        <div>
          <h4 class="font-bold text-primary mb-1">${p.name}</h4>
          <p class="text-xs text-on-surface-variant line-clamp-2 mb-2">${p.desc}</p>
          <div class="font-black text-primary mb-4">₹${p.price}</div>
        </div>
        <div class="mt-auto pt-4 border-t border-outline/10 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold ${isAvail ? 'text-secondary' : 'text-outline'}">${isAvail ? 'In Stock' : 'Out of Stock'}</span>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" onchange="toggleProductStock('${p.id}', this.checked)" class="sr-only peer" ${isAvail ? 'checked' : ''}>
              <div class="w-9 h-5 bg-outline-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-secondary"></div>
            </label>
          </div>
          <div class="flex gap-2">
            <button onclick="editProduct('${p.id}')" class="flex-1 py-2 text-xs font-bold bg-surface-container-high rounded border border-outline/20 hover:bg-surface-container-highest transition-colors text-primary">Edit</button>
            <button onclick="deleteProduct('${p.id}')" class="flex-1 py-2 text-xs font-bold bg-red-50 text-red-600 rounded border border-red-100 hover:bg-red-100 transition-colors">Delete</button>
          </div>
        </div>
      </div>`;
    });
    if(html === "") html = `<div class="p-8 text-center text-on-surface-variant col-span-full">No products found.</div>`;
    grid.innerHTML = html;

    // Populate category suggestions datalist for collection Target Category
    const cats = [...new Set(currentProducts.map(p => (p.category || '').trim()).filter(Boolean))];
    const dl = document.getElementById('categories-datalist');
    if (dl) dl.innerHTML = cats.map(c => `<option value="${c}">`).join('');
  }, error => {
    console.error("Firestore products query failed:", error);
    const grid = document.getElementById("products-grid");
    if (grid) {
      grid.innerHTML = `<div class="p-8 text-center text-red-600 font-bold col-span-full">Error loading products: ${error.message}</div>`;
    }
  });
}

function closeProductModal() {
  document.getElementById('add-product-modal').classList.add('hidden');
  document.getElementById('product-form').reset();
  document.getElementById('prod-id').value = '';
  document.getElementById('prod-category').value = '';
  document.getElementById('prod-original-price').value = '';
  document.getElementById('product-modal-title').innerText = 'Add Product';
  const preview = document.getElementById('prod-img-preview');
  if (preview) preview.innerHTML = '';
  // Reset extras panel
  const extrasList = document.getElementById('prod-extras-list');
  if (extrasList) extrasList.innerHTML = '';
  const panel = document.getElementById('prod-extras-panel');
  const arrow = document.getElementById('prod-extras-arrow');
  if (panel) panel.classList.add('hidden');
  if (arrow) { arrow.textContent = 'expand_more'; arrow.style.transform = ''; }
}

// ── Per-Product Extras Helpers ──────────────────────────────────
window.toggleProdExtras = function() {
  const panel = document.getElementById('prod-extras-panel');
  const arrow = document.getElementById('prod-extras-arrow');
  const isHidden = panel.classList.contains('hidden');
  panel.classList.toggle('hidden', !isHidden);
  arrow.style.transform = isHidden ? 'rotate(180deg)' : '';
};

window.addProdExtraRow = function(data = {}) {
  const list = document.getElementById('prod-extras-list');
  const idx = list.querySelectorAll('.prod-extra-row').length;
  const div = document.createElement('div');
  div.className = 'prod-extra-row flex gap-2 items-center';
  div.innerHTML = `
    <input type="text" class="extra-name flex-1 bg-surface-container-lowest rounded-xl p-2.5 text-sm border border-outline/20" placeholder="e.g. Extra Ice" value="${data.name || ''}">
    <input type="number" class="extra-price w-20 bg-surface-container-lowest rounded-xl p-2.5 text-sm border border-outline/20" placeholder="₹" min="0" value="${data.price !== undefined ? data.price : ''}">
    <button type="button" onclick="this.closest('.prod-extra-row').remove()" class="text-red-400 hover:text-red-600 transition-colors shrink-0">
      <span class="material-symbols-outlined text-base">delete</span>
    </button>
  `;
  list.appendChild(div);
  // Auto-open panel when first row added
  const panel = document.getElementById('prod-extras-panel');
  const arrow = document.getElementById('prod-extras-arrow');
  if (panel.classList.contains('hidden')) {
    panel.classList.remove('hidden');
    arrow.style.transform = 'rotate(180deg)';
  }
};

function renderProdExtraRows(dataArr) {
  const list = document.getElementById('prod-extras-list');
  list.innerHTML = '';
  if (dataArr && dataArr.length > 0) {
    dataArr.forEach(item => addProdExtraRow(item));
  }
}

document.getElementById("product-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("prod-id").value;
  const fileInput = document.getElementById("prod-img");
  const oldUrl = document.getElementById("prod-img-url").value;
  const btn = e.target.querySelector("button[type='submit']");
  btn.disabled = true;

  // Gather existing images from preview (kept ones)
  let existingImages = [];
  document.querySelectorAll('#prod-img-preview img').forEach(img => existingImages.push(img.dataset.url));

  const saveProductToDB = (newImageUrls) => {
    const allImages = [...existingImages, ...newImageUrls];
    if (allImages.length === 0) allImages.push(oldUrl || 'https://placehold.co/400');

    // Collect per-product extras
    const extrasArr = [];
    document.querySelectorAll('#prod-extras-list .prod-extra-row').forEach(row => {
      const name = row.querySelector('.extra-name').value.trim();
      const price = row.querySelector('.extra-price').value.trim();
      if (name) extrasArr.push({ name, price: price ? Number(price) : 0 });
    });

    const payload = {
      name: document.getElementById("prod-name").value,
      category: document.getElementById("prod-category").value,
      price: document.getElementById("prod-price").value,
      originalPrice: document.getElementById("prod-original-price").value ? Number(document.getElementById("prod-original-price").value) : null,
      badge: document.getElementById("prod-badge").value,
      img: allImages[0],
      images: allImages,
      desc: document.getElementById("prod-desc").value,
      outOfStock: document.getElementById("prod-outofstock").checked,
      extras: extrasArr
    };
    const task = id ? db.collection("products").doc(id).update(payload) : db.collection("products").add(payload);
    task.then(() => { btn.disabled = false; closeProductModal(); });
  };

  if (fileInput.files.length > 0) {
    document.getElementById("upload-progress").classList.remove("hidden");
    const compressionPromises = Array.from(fileInput.files).map(f => compressAndGetBase64(f));
    try {
      const newUrls = await Promise.all(compressionPromises);
      document.getElementById("upload-progress").classList.add("hidden");
      saveProductToDB(newUrls);
    } catch (err) {
      console.error(err);
      document.getElementById("upload-progress").classList.add("hidden");
      alert("Image compression failed.");
      btn.disabled = false;
    }
  } else {
    const newUrlField = document.getElementById("prod-img-newurl");
    if (newUrlField && newUrlField.value.trim() !== "") {
      const urlLines = newUrlField.value.split('\n').map(u => u.trim()).filter(Boolean);
      saveProductToDB(urlLines);
    } else {
      saveProductToDB([]);
    }
  }
});

window.editProduct = function(id) {
  const p = currentProducts.find(x => x.id === id);
  if(!p) return;
  document.getElementById("prod-id").value = p.id;
  document.getElementById("prod-name").value = p.name;
  document.getElementById("prod-category").value = p.category || "";
  document.getElementById("prod-price").value = p.price;
  document.getElementById("prod-original-price").value = p.originalPrice || "";
  document.getElementById("prod-badge").value = p.badge || "";
  document.getElementById("prod-img").value = "";
  document.getElementById("prod-img-newurl").value = "";
  document.getElementById("prod-img-url").value = p.img;
  document.getElementById("prod-desc").value = p.desc;
  document.getElementById("prod-outofstock").checked = p.outOfStock;

  // Render image previews
  const preview = document.getElementById('prod-img-preview');
  const imgs = p.images && p.images.length ? p.images : (p.img ? [p.img] : []);
  preview.innerHTML = imgs.map((url, i) => `
    <div class="relative" id="img-preview-${i}">
      <img src="${url}" data-url="${url}" class="w-16 h-16 object-cover rounded-lg border border-outline/20" title="Image ${i+1}">
      <button type="button" onclick="removePreviewImg(${i})" class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center font-black hover:bg-red-700">×</button>
    </div>`).join('');

  // Load per-product extras
  renderProdExtraRows(p.extras || []);
  if (p.extras && p.extras.length > 0) {
    const panel = document.getElementById('prod-extras-panel');
    const arrow = document.getElementById('prod-extras-arrow');
    if (panel) panel.classList.remove('hidden');
    if (arrow) arrow.style.transform = 'rotate(180deg)';
  }

  document.getElementById('product-modal-title').innerText = 'Edit Product';
  document.getElementById('add-product-modal').classList.remove('hidden');
};

window.removePreviewImg = function(i) {
  const el = document.getElementById('img-preview-'+i);
  if (el) el.remove();
};

window.deleteProduct = function(id) {
  if(confirm("Are you sure you want to delete this product?")) {
    db.collection("products").doc(id).delete();
  }
}

window.toggleProductStock = function(id, isAvailable) {
  db.collection("products").doc(id).update({ outOfStock: !isAvailable });
};

// ──────────────────────────────────────────────
//  ⭐  REVIEW MANAGEMENT
// ──────────────────────────────────────────────
function loadReviews() {
  db.collection("reviews").orderBy("timestamp", "desc").onSnapshot(snapshot => {
    const grid = document.getElementById("reviews-grid");
    if(snapshot.empty) {
      grid.innerHTML = `<div class="p-8 text-center text-on-surface-variant col-span-full">No reviews submitted yet.</div>`;
      return;
    }

    let html = "";
    snapshot.forEach(doc => {
      const rev = doc.data();
      const isApproved = rev.status === "approved";
      
      html += `
      <div class="glass-card p-6 rounded-2xl bg-white border ${isApproved ? 'border-secondary/20' : 'border-outline/20'}">
        <div class="flex justify-between items-start mb-4">
          <div>
            <h4 class="font-bold text-primary">${rev.name}</h4>
            <div class="flex text-secondary text-sm"><span class="material-symbols-outlined text-sm">star</span><span class="material-symbols-outlined text-sm">star</span><span class="material-symbols-outlined text-sm">star</span><span class="material-symbols-outlined text-sm">star</span><span class="material-symbols-outlined text-sm">star</span></div>
          </div>
          <span class="px-3 py-1 rounded-full text-xs font-bold ${isApproved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
            ${isApproved ? 'Approved' : 'Pending'}
          </span>
        </div>
        <p class="text-sm text-on-surface-variant italic mb-6">"${rev.text}"</p>
        <div class="flex gap-2 border-t border-outline/10 pt-4">
          <button onclick="updateReview('${doc.id}', 'approved')" class="flex-1 py-2 text-xs font-bold rounded border ${isApproved ? 'bg-secondary text-white' : 'hover:bg-green-50 text-secondary border-secondary'} transition-colors">Approve</button>
          <button onclick="updateReview('${doc.id}', 'rejected')" class="flex-1 py-2 text-xs font-bold rounded border ${!isApproved ? 'bg-red-50 text-red-600' : 'hover:bg-red-50 text-outline'} transition-colors">Reject/Hide</button>
        </div>
      </div>`;
    });
    grid.innerHTML = html;
  }, error => {
    console.error("Firestore reviews query failed:", error);
    const grid = document.getElementById("reviews-grid");
    if (grid) {
      grid.innerHTML = `<div class="p-8 text-center text-red-600 font-bold col-span-full">Error loading reviews: ${error.message}</div>`;
    }
  });
}

window.updateReview = function(id, status) {
  db.collection("reviews").doc(id).update({ status: status });
}

// Fallback seed function so website isn't completely empty initially
function seedInitialProducts() {
  const seed = [
    { name: "Caramel Cloud Cold Brew", desc: "Velvety foam layered over our signature 18-hour steep, finished with house-made caramel.", price: 149, badge: "⭐ Best Seller", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAI6bqWnV0eVhM2O80smaAPhKZFI-FT2yStUZg6x25CTYRxKrbJ1_EwiHqdP-z2JAEh2Mt7M2UpaTqeRv9LxGfMNVWc7FpvlFou7uMSgpPSwIOi78vmSOQUm2sGZ6v63p3hXSWx14igFVv4hqozF6Gyr39eGd1AF-A6uwlFvWbF474rnHGS3GIaTQS0JKPKXkt7JlPCLnfkTEBkMF9JXzO4BUPdhR1rCIt8qhN-bC4F188wKXgwMPNk35lW-EsHKE7fdTJVNzetQNY", outOfStock: false },
    { name: "Midnight Mojito", desc: "Deep berry infusion with muddled garden mint and a sharp citrus kick. Refreshment redefined.", price: 129, badge: "🌿 Fresh", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuB5LGsFaMQsbTUvg6V0D9fspBYiroXPnhIbkT37XKWHjwMf9BIfuCCe78eBxUOYHN3xEgnW7qQnjxTwyCE_9Zsq69yNdR-kUUY4x-8mRStukBAaPwTf2ZgUruX_LsOvfsVECUn-sPF5bbXsWHb5oY-Q4pgjqhKMK3P5M3mKZDBuQTKjfnASrQXPqLjT4Q7k2MpDCBs6ahJBjJVLaIawepdF2dEgNw9Nk17nOrxk7d8KDka1E0CyK68YVfDNUM2r1BoR_PknTYJmw3U", outOfStock: false },
    { name: "Dipu's Mini-Brew Keychain", desc: "Individually handcrafted resin keychains. A tiny piece of CoMoAdda to carry everywhere.", price: 89, badge: "🎨 Handmade", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBg3px03BErm9fszHgQXGvDPcbasCwngej2BR1hOvOJz-oIK-Qcv24uy-LPv5ElFxx5yMIBXk2zBpxoCthQ6USl864ekLf00Kx4HtayCXVIftcWap9plu7XwLUdVU8wM7LftQfza51WviuznGClnw0i2SCwXQqFCRKkb3Vmwci-2qgmFL3VH2KYks33BH8dCOVh9thysVhPVm9S6pPzB0tppaCuB2narmQlLTezsJsMhCD_Tt-27kwXGyEIDlSJ7_XqAEbSX-Q99LM", outOfStock: false },
    { name: "Sunrise Orange Burst", desc: "Freshly squeezed oranges blended with a hint of ginger. Pure, organic, no added sugar.", price: 99, badge: "🍊 Organic", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDIntQ-ubtNMEvijaYU5lNeNGFs8vLYNcKKN9H3CmkVMycEJRm1vfNBYI2le0aZqU682HqK-s_l-1zhg7FMcY7_HigBSIYacu36QvRKe4jMvXqPbC4HhiS-KUruCZgVS7Sdmx_ca3r6Shf2H0W_CxMaP3dHqgU4yBuEu5Q5PLFGbvpjf4acHMBJfMl8IgRZ1tWJ25ovHLS2omkedNxpNxgZ_XJsPQUS6rVwGS-ZHDmEBokWR5Xx-xKWA9ueCdtcRHsInH91b63VGJY", outOfStock: false },
    { name: "Classic Cold Brew", desc: "No-frills, full-flavour. The original CoMoAdda slow-steeped cold brew. Bold, smooth, iconic.", price: 119, badge: "🏆 Classic", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCrPHB9YCAT75EtF4hVagAl11ELzw5MsHEZR0kPmkn0IxnCWITy0gy6GziNw1zi8gaZLUS56R6kqXjBBh67nKIQi_fXsyBgmaLzPtGmMHLAxgssHVJdy1E_3Ud-tzosQj-F34bKSkjxW5TERUIaTH-eM-s-J7w_aaT2cyzoV_w4uQEYiEc4hka7a8smMj8EnxMx4D9cVoRYdFv1GlqMWfxcu5OpwWvA6aDZyNDuspvsncnHnMgp2cWt0rSLyELFYL-HRq3KSMWxP0U", outOfStock: false },
    { name: "Dragon Berry Cooler", desc: "Dragonfruit, mint, and sparkling water fused into one electrifying, Insta-worthy cooler.", price: 139, badge: "🔥 Trending", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDG5dgLYqM4_p9H4qSZGU_1UGOu29_5DLGSxSR-S9I1Ky7kVn8Q9zDiX5am5l0RqDuEmMeNIxb-j7LHhx2r4-KuvsO1WWdIndFOaREFzRQT26Mr0dI_M33zefuCoWL9O7y-yQ9fLQij3nR4fHkAOmWyH8c8Yr56XPAvHe1fSGt7EQN7SILqPZKbZgAk5X1yTOo_Ikapc8HiX8cpBNbA74xWANTxOvE3q1XAbuqAeZbe6N7edSj5Z0HnO1N2hhlYjXuvMmSTz1zDoKs", outOfStock: false }
  ];
  seed.forEach(s => db.collection("products").add(s));
}

// ──────────────────────────────────────────────
//  🎁  OFFERS & PROMO CODES MANAGEMENT
// ──────────────────────────────────────────────
window.toggleOfferImageField = function() {
  const type = document.getElementById("offer-type").value;
  const imgBlock = document.getElementById("offer-img-block");
  const discountBlock = document.getElementById("offer-discount-block");
  if(type === "freeGift") {
    imgBlock.classList.remove("hidden");
    // only require image on new entries, not edits
    if(!document.getElementById("offer-code").getAttribute("data-editing")) {
      document.getElementById("offer-img").required = false; // optional for freeGift too
    }
  } else {
    imgBlock.classList.add("hidden");
    document.getElementById("offer-img").required = false;
  }

  if(type === "discountCode" || type === "brew20") {
    discountBlock.classList.remove("hidden");
  } else {
    discountBlock.classList.add("hidden");
  }
}

let currentEditOfferUses = 0;
let currentEditOfferImg = null;
let currentEditOfferDesc = "";

window.closeOfferModal = function() {
  document.getElementById("add-offer-modal").classList.add("hidden");
  document.getElementById("offer-form").reset();
  document.getElementById("offer-code").disabled = false;
  document.getElementById("offer-code").removeAttribute("data-editing");
  document.getElementById("offer-modal-title").textContent = "Add Reward / Code";
  document.getElementById("offer-discount-pct").value = 20;
  currentEditOfferUses = 0;
  currentEditOfferImg = null;
  currentEditOfferDesc = "";
  toggleOfferImageField();
}

// Open modal pre-filled with a fresh RWD- Reward Code
window.openNewRewardCode = function() {
  closeOfferModal(); // reset state
  const code = "RWD-" + Math.random().toString(36).substring(2, 8).toUpperCase();
  document.getElementById("offer-code").value = code;
  document.getElementById("offer-type").value = "rewardCode";
  document.getElementById("offer-limit").value = 1;
  document.getElementById("offer-modal-title").textContent = `Create Reward Code (${currentSettings.rewardPointsRequired || 600}pts)`;
  document.getElementById("add-offer-modal").classList.remove("hidden");
  toggleOfferImageField();
}

function loadOffers() {
  db.collection("promoCodes").onSnapshot(snapshot => {
    const grid = document.getElementById("offers-grid");
    if(snapshot.empty) {
      grid.innerHTML = `<div class="p-8 text-center text-on-surface-variant col-span-full">No active offers. Use the buttons above to create one.</div>`;
      return;
    }

    let html = "";
    snapshot.forEach(doc => {
      const data = doc.data();
      const code = doc.id;
      const isGift = data.type === 'freeGift';
      const isReward = data.type === 'rewardCode';
      const isDiscount = data.type === 'discountCode' || data.type === 'brew20';
      const discountPct = data.discountPct || 20;
      const typeLabel = isGift ? '🎁 Free Gift' : isReward ? '🎟️ Reward Code' : `💎 ${discountPct}% Discount`;
      const typeBg = isGift ? 'bg-green-50 text-green-700 border-green-200'
                   : isReward ? 'bg-purple-50 text-purple-700 border-purple-200'
                   : 'bg-blue-50 text-blue-700 border-blue-200';
      const uses = data.uses || 0;
      const limit = data.limit;
      const remaining = limit ? limit - uses : null;
      const isExpired = limit && uses >= limit;

      html += `
      <div class="glass-card p-5 rounded-2xl flex flex-col bg-white border ${isExpired ? 'border-red-200 opacity-60' : 'border-outline/10'} relative">
        ${isExpired ? '<div class="absolute top-3 right-3 text-[10px] font-black bg-red-100 text-red-600 px-2 py-0.5 rounded-full uppercase tracking-widest">Expired</div>' : ''}
        <span class="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border self-start mb-3 ${typeBg}">${typeLabel}</span>
        <h4 class="font-mono text-lg font-black text-secondary tracking-widest mb-1">${code}</h4>
        ${data.desc ? `<p class="text-xs text-on-surface-variant mb-3 leading-relaxed">${data.desc}</p>` : ''}
        ${data.img ? `<img src="${data.img}" class="w-full h-28 object-contain bg-surface-container rounded-xl mb-3 border border-outline/10">` : ''}
        <div class="flex justify-between text-xs text-on-surface-variant border-t border-outline/10 pt-3 mb-3">
          <span>Uses: <strong class="text-primary">${uses}</strong></span>
          <span>Limit: <strong class="text-primary">${limit || '∞'}</strong></span>
          ${remaining !== null ? `<span>Left: <strong class="${remaining <= 3 ? 'text-red-600' : 'text-primary'}">${remaining}</strong></span>` : ''}
        </div>
        <div class="flex gap-2 mt-auto">
          <button onclick="editOffer('${code}')" class="flex-1 py-2 text-xs font-bold bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors border border-blue-100">✏️ Edit</button>
          <button onclick="deleteOffer('${code}')" class="flex-1 py-2 text-xs font-bold bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors border border-red-100">🗑️ Delete</button>
        </div>
      </div>`;
    });
    grid.innerHTML = html;
  }, error => {
    console.error("Firestore promoCodes query failed:", error);
    const grid = document.getElementById("offers-grid");
    if (grid) {
      grid.innerHTML = `<div class="p-8 text-center text-red-600 font-bold col-span-full">Error loading offers/promos: ${error.message}</div>`;
    }
  });
}

document.getElementById("offer-form").addEventListener("submit", (e) => {
  e.preventDefault();
  let code = document.getElementById("offer-code").value.trim().toUpperCase();
  const type = document.getElementById("offer-type").value;
  const limitInput = document.getElementById("offer-limit").value;
  // rewardCode defaults to 1 use; others default to 30
  const limit = parseInt(limitInput) || (type === "rewardCode" ? 1 : 30);
  const desc = document.getElementById("offer-desc").value.trim();
  const btn = e.target.querySelector("button[type='submit']");
  const originalCode = document.getElementById("offer-code").getAttribute("data-editing"); // set when editing
  const isEdit = !!originalCode;

  if(!code) {
    code = "RWD-" + Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  btn.disabled = true;

  const saveToDB = (imgUrl = null) => {
    const payload = {
      type: type,
      limit: limit,
      desc: desc,
      uses: isEdit ? currentEditOfferUses : 0
    };
    if (type === "discountCode" || type === "brew20") {
      payload.discountPct = parseInt(document.getElementById("offer-discount-pct").value) || 20;
    }
    if(imgUrl) {
      payload.img = imgUrl;
    } else if (isEdit && currentEditOfferImg) {
      payload.img = currentEditOfferImg;
    }

    const doSave = () => db.collection("promoCodes").doc(code).set(payload).then(() => {
      btn.disabled = false;
      closeOfferModal();
    }).catch(err => {
      alert("Error saving offer: " + err.message);
      btn.disabled = false;
    });

    // If code was renamed, delete old doc first
    if(isEdit && originalCode !== code) {
      db.collection("promoCodes").doc(originalCode).delete().then(doSave).catch(doSave);
    } else {
      doSave();
    }
  };

  const fileInput = document.getElementById("offer-img");
  if(type === "freeGift" && fileInput.files.length > 0) {
     document.getElementById("offer-upload-progress").classList.remove("hidden");
     compressAndGetBase64(fileInput.files[0]).then(base64Url => {
       document.getElementById("offer-upload-progress").classList.add("hidden");
       saveToDB(base64Url);
     }).catch(err => {
       console.error(err);
       btn.disabled = false;
       document.getElementById("offer-upload-progress").classList.add("hidden");
       alert("Error compressing offer image.");
     });
  } else {
     saveToDB();
  }
});

window.editOffer = function(code) {
  db.collection("promoCodes").doc(code).get().then(doc => {
    if(!doc.exists) return;
    const data = doc.data();
    document.getElementById("offer-code").value = code;
    document.getElementById("offer-code").disabled = false; // allow renaming
    document.getElementById("offer-code").setAttribute("data-editing", code); // track original ID
    document.getElementById("offer-type").value = data.type === "brew20" ? "discountCode" : (data.type || "discountCode");
    document.getElementById("offer-limit").value = data.limit || 1;
    document.getElementById("offer-desc").value = data.desc || "";
    document.getElementById("offer-discount-pct").value = data.discountPct || 20;
    document.getElementById("offer-modal-title").textContent = "Edit Offer: " + code;
    currentEditOfferUses = data.uses || 0;
    currentEditOfferImg = data.img || null;

    toggleOfferImageField();
    document.getElementById("offer-img").required = false;

    document.getElementById("add-offer-modal").classList.remove("hidden");
  });
};

window.deleteOffer = function(codeId) {
  if(confirm("Are you sure you want to permanently delete this code and offer?")) {
    db.collection("promoCodes").doc(codeId).delete();
  }
};

// ──────────────────────────────────────────────
//  👤  ADMIN CREATION LOGIC
// ──────────────────────────────────────────────
const createAdminForm = document.getElementById("create-admin-form");
if (createAdminForm) {
  createAdminForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("btn-create-admin");
    const msg = document.getElementById("create-admin-msg");
    const errEl = document.getElementById("create-admin-err");
    const email = document.getElementById("new-admin-email").value.trim();
    const password = document.getElementById("new-admin-password").value;

    if (password.length < 6) {
      errEl.textContent = "Password must be at least 6 characters.";
      errEl.classList.remove("hidden");
      return;
    }

    const origHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-base">progress_activity</span> Creating...';
    errEl.classList.add("hidden");
    msg.classList.add("hidden");

    try {
      const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email,
          password: password,
          returnSecureToken: false
        })
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error.message);
      }

      msg.classList.remove("hidden");
      document.getElementById("new-admin-email").value = "";
      document.getElementById("new-admin-password").value = "";
    } catch (error) {
      console.error("Admin creation failed:", error);
      errEl.textContent = "Error: " + error.message;
      errEl.classList.remove("hidden");
    } finally {
      btn.disabled = false;
      btn.innerHTML = origHtml;
      setTimeout(() => { msg.classList.add("hidden"); errEl.classList.add("hidden"); }, 5000);
    }
  });
}
