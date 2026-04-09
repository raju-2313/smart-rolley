console.log("Smart Trolley System Loaded");
const trolleyId = "TROLLEY-1";


// ================= GLOBAL STATE =================

let cart = {};
let checkoutMode = false;
let selectedPaymentMode = "";
let finishProcessing = false;
let barcodeBuffer = "";
let barcodeTimer = null;
let productMap = {};
let scanningEnabled = true;
let lastScanTime = Date.now();
let activitySeconds = 0 ;
let checkoutLocked = false;          // LOCK: true after checkout confirmed

// ================= BUILD PRODUCT MAP =================

if (typeof products !== "undefined" && Array.isArray(products)) {
    products.forEach(p => {
        productMap[String(p.barcode)] = p;
    });
}

// ================= ELEMENTS =================

const totalDisplay = document.getElementById("total");
const checkoutBtn = document.getElementById("checkoutBtn");
const paymentSection = document.getElementById("paymentSection");
const onlineBtn = document.getElementById("onlineBtn");
const offlineBtn = document.getElementById("offlineBtn");
const qrSection = document.getElementById("qrSection");
const counterSection = document.getElementById("counterSection");
const finishBtn = document.getElementById("finishBtn");
const offlineIndicator = document.getElementById("offlineIndicator");
const clearCartBtn = document.getElementById("clearCartBtn");
const manualInput = document.getElementById("manualBarcode");
const manualBtn = document.getElementById("manualAddBtn");
const printArea = document.getElementById("printArea");
const peer = new Peer("billing-device");



peer.on("connection" , (conn)=>{
    console.log("Scanner Connected");
    conn.on("data",(barcode)=>{
        console.log("Received",barcode);

        if(productMap[barcode]){
            addItem(barcode);  
        }else{
            alert("Product not found");
        }
    });
});

// const FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSfuinHscPQw3Db6OGsiNO3X3Fta6rrqAPhuWT299p9xEl_rGA/formResponse";
const supabaseUrl = "https://nqjuqjrafhurzkudqcbn.supabase.co";
const supabaseKey = "sb_publishable_v6cpkfut0eEAlapT0g5Ojw_3ZVa-U8u";

const supabaseClient = window.supabase.createClient(supabaseUrl,supabaseKey);
// function saveBillToSheet(bill) {

//     const formData = new FormData();

//     formData.append("entry.642978601", bill.billId);
//     formData.append("entry.2011332081", bill.total);
//     formData.append("entry.1298198872", bill.paymentMode);
//     formData.append("entry.545094809", bill.date);

//     fetch(FORM_URL, {
//         method: "POST",
//         mode: "no-cors",
//         body: formData
//     });

// }
supabaseClient
.channel("scan-channel")
.on(
 "postgres_changes",
 {
   event:"INSERT",
   schema:"public",
   table:"scans"
 },
 (payload)=>{
    if(!scanningEnabled) return;

   const barcode = payload.new.barcode;

   console.log("Scan received:",barcode);

   if(productMap[barcode]){
      addItem(barcode);
   }

 }
)
.subscribe();
const scannerInput = document.getElementById("scannerInput");

if(scannerInput){

    scannerInput.focus();

    scannerInput.addEventListener("keydown", function(e){

if(e.key === "Enter"){

    let code = scannerInput.value.trim();

if(!productMap[code]){
    alert("Product not found");
    scannerInput.value="";
    scannerInput.focus();
    return;
}

addItem(code);

scannerInput.value="";
scannerInput.focus();

}

});

}
// ================= KEYBOARD / SCANNER =================
document.addEventListener("click", () => {
    if(!scanningEnabled) return;
    scannerInput.focus();
});

// document.addEventListener("keydown", function (e) {

//     if (checkoutMode) return;

//     if (e.key === "Enter") {

//         if (barcodeBuffer.length >= 3 && productMap[barcodeBuffer]) {
//             addItem(barcodeBuffer);
//         }

//         barcodeBuffer = "";
        // return;                                          //This can be used to enter the manual inputs 
//     }

//     if (/^[0-9]$/.test(e.key)) {
//         barcodeBuffer += e.key;
//     }
// });

// ================= MANUAL ADD =================
// ── Robot Language Selector ──────────────────────────────
function selectLang(lang) {

    localStorage.setItem("selectedLanguage", lang);

    const audio = document.getElementById("langAudio");
    if (audio) { audio.pause(); audio.currentTime = 0; }

    const overlay = document.getElementById("langRobotOverlay");
    if (overlay) overlay.classList.remove("active"); // ← single clean line

    const interval = setInterval(() => {
        const select = document.querySelector(".goog-te-combo");
        if (select) {
            select.value = lang;
            select.dispatchEvent(new Event("change"));
            clearInterval(interval);
        }
    }, 300);
}

// ── Auto-play audio when overlay is shown ────────────────
window.addEventListener("load", () => {

    const savedLang = localStorage.getItem("selectedLanguage");

    if (savedLang) {
        // Language already chosen on a previous visit — skip robot
        const overlay = document.getElementById("langRobotOverlay");
        if (overlay) overlay.style.display = "none";

        // Apply saved language (existing behaviour)
        setTimeout(() => {
            const select = document.querySelector(".goog-te-combo");
            if (select) {
                select.value = savedLang;
                select.dispatchEvent(new Event("change"));
            }
        }, 1000);

    } else {
        // First visit — play audio
        const audio = document.getElementById("langAudio");
        if (audio) {
            audio.play().catch(() => {
                // Autoplay blocked by browser — silent fail, buttons still work
            });
        }
    }
});

if (manualBtn && manualInput) {
    manualBtn.addEventListener("click", function () {

        let code = manualInput.value;

        code = code.replace(/\s+/g, "");  // remove ALL spaces
        code = String(code);

        if (!productMap[code]) {
            alert("Product not found");
            return;
        }

        addItem(code);
        manualInput.value = "";
    });


}

// ================= CART FUNCTIONS =================
function showSuggestions(product) {

    if (!product.suggestions || product.suggestions.length === 0) return;

    const box = document.getElementById("suggestionBox");
    if (!box) return;

    box.innerHTML = "";

    product.suggestions.forEach(code => {

        const suggested = productMap[String(code)];
        if (!suggested) return;

        const card = document.createElement("div");
        card.className = "suggestion-card";

        card.innerHTML = `
            <div class="suggest-title">${suggested.name}</div>
            <div class="suggest-price">₹${suggested.price}</div>
        `;

        card.onclick = () => {
            addItem(String(suggested.barcode));
            box.classList.remove("show");
        };

        box.appendChild(card);
    });

    box.classList.add("show");

    setTimeout(() => {
        box.classList.remove("show");
    }, 5000);
}

setInterval(() => {

    const now = Date.now();

    const diff = now - lastScanTime;

    const seconds = Math.floor(diff / 1000);

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    const display =
        String(minutes).padStart(2,"0")
        + ":" +
        String(remainingSeconds).padStart(2,"0");

    document.getElementById("activityTimer").textContent = display;

},1000);

setInterval(()=>{

    const now = Date.now();
    const diff = now - lastScanTime;

    const minutes = diff / 60000;

    if(minutes > 20){

        sendTrolleyAlert();

        lastScanTime = Date.now();

    }

},6000);
function addToCart(barcode) {

    console.log("Product scanned:", product);
    console.log("Suggestions:", product.suggestions);

    const product = productMap[String(barcode)];
    if (!product) return;

    if (cart[barcode]) {
        cart[barcode].qty++;
    } else {
        cart[barcode] = {
            name: product.name,
            price: product.price,
            qty: 1
        };
    }

    updateCart();

    showSuggestions(product); // THIS is what you were missing
}
function addItem(barcode) {

    // LOCK: ignore scans after checkout confirmed
    if (checkoutLocked) { showLockMessage(); return; }

    lastScanTime = Date.now();
    // Normalize barcode
    barcode = String(barcode).trim();

    const product = productMap[barcode];

    if (!product) {
        alert("Invalid product");
        return;
    }

    // Add or increase quantity
    if (!cart[barcode]) {

        cart[barcode] = {
            name: product.name,
            price: product.price,
            quantity: 1
        };

    } else {

        cart[barcode].quantity++;

    }

    saveCart();
    updateCart();

    // Show product suggestions
    showSuggestions(product);
}

function updateCart() {

    const cartBody = document.getElementById("cartBody");
    if (!cartBody) return;

    cartBody.innerHTML = "";
    let total = 0;

    for (let code in cart) {

        const item = cart[code];
        const itemTotal = item.price * item.quantity;
        total += itemTotal;

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${item.name}</td>
            <td>${item.quantity}</td>
            <td>₹${item.price}</td>
            <td>₹${itemTotal}</td>
            <td>
                <button class="btn-increase" onclick="increaseItem('${code}')">+</button>
                <button class="btn-decrease" onclick="decreaseItem('${code}')">−</button>
                <button onclick="removeItem('${code}')">&times;</button>
            </td>
        `;

        cartBody.appendChild(row);
    }

    const totalDisplay = document.getElementById("total");
    if (totalDisplay)
        totalDisplay.textContent = "Total: ₹" + total.toFixed(2);

    const checkoutBtn = document.getElementById("checkoutBtn");
    if (checkoutBtn)
        checkoutBtn.disabled = total === 0;

    // Re-apply visual lock after every cart re-render
    if (checkoutLocked) applyCartLockUI();
}

function increaseItem(code) {
    if (checkoutLocked) { showLockMessage(); return; }
    if(!cart[code]) return;

    cart[code].quantity++;
    saveCart();
    updateCart();
}
function decreaseItem(code) {
    if (checkoutLocked) { showLockMessage(); return; }
    if (cart[code].quantity > 1) {
        cart[code].quantity--;
    } else {
        delete cart[code];
    }
    saveCart();
    updateCart();
}

function removeItem(code) {
    if (checkoutLocked) { showLockMessage(); return; }
    delete cart[code];
    saveCart();
    updateCart();
}

// ================= CHECKOUT =================

// ================= CHECKOUT LOCK =================

function showLockMessage() {
    var banner = document.getElementById("lockBanner");
    if (!banner) return;
    banner.style.display = "flex";
    clearTimeout(window._lockBannerTimer);
    window._lockBannerTimer = setTimeout(function() {
        banner.style.display = "none";
    }, 2200);
}

function applyCartLockUI() {
    document.querySelectorAll(
        "#cartBody .btn-increase, #cartBody .btn-decrease, #cartBody button"
    ).forEach(function(btn) {
        btn.disabled = true;
        btn.style.opacity = "0.3";
        btn.style.cursor  = "not-allowed";
    });
}

checkoutBtn?.addEventListener("click", () => {

    if (Object.keys(cart).length === 0) return;

    // Show lock-confirmation popup before activating checkout
    showConfirmModal(
        "Once checkout starts, the trolley will be locked.<br>"
        + "No items can be added or removed after this step.",
        function () {

            // YES pressed
            checkoutLocked   = true;
            checkoutMode     = true;
            scanningEnabled  = false;
            localStorage.setItem("checkoutLocked", "true");

            checkoutBtn.disabled = true;
            paymentSection.style.display = "block";

            // Dim cart action buttons immediately
            applyCartLockUI();

        }
    );

    // CANCEL: showConfirmModal does nothing, lock stays false
});

// ================= PAYMENT =================

onlineBtn?.addEventListener("click", () => {

    selectedPaymentMode = "Online";

    qrSection.style.display = "block";
    counterSection.style.display = "none";
    finishBtn.style.display = "block";

});

offlineBtn?.addEventListener("click", () => {
    selectedPaymentMode = "Offline";
    qrSection.style.display = "none";
    counterSection.style.display = "block";
    finishBtn.style.display = "block";
});

function showConfirmModal(message, onConfirm) {

    const modal = document.getElementById("customModal");
    const modalMessage = document.getElementById("modalMessage");

    if (!modal || !modalMessage) {
        alert("Modal structure missing in HTML");
        return;
    }

    modalMessage.innerHTML = `
        <p>${message}</p>
        <div style="margin-top:15px;">
            <button id="confirmYes">Yes</button>
            <button id="confirmNo">Cancel</button>
        </div>
    `;

    modal.style.display = "flex";

    document.getElementById("confirmYes").onclick = function () {
        modal.style.display = "none";
        onConfirm();
    };

    document.getElementById("confirmNo").onclick = function () {
        modal.style.display = "none";
    };
}
// ================= FINISH =================

finishBtn?.addEventListener("click", () => {

    if (Object.keys(cart).length === 0) return;

    if (!selectedPaymentMode) {
        alert("Select payment method first");
        return;
    }

    showConfirmModal(
        "Confirm payment and print receipt?<br>This action cannot be undone.",
        async function () {

            finishBtn.disabled = true;

            const bill = generateBill();

            const saved = await saveBillToSupabase(bill);

            if (saved) {

                // Save all line items
                await saveOrderItems(bill);

                // Save offline backup before navigating away
                saveBillOffline(bill);

                // =====================================================
                // BROADCAST: tell the admin dashboard a new order
                // was just confirmed. Uses Supabase Broadcast so it
                // works across different devices on the same network.
                // The admin listens on 'dashboard-sync' channel and
                // calls loadDashboard() the moment this fires.
                // =====================================================
                try {
                    await supabaseClient
                        .channel('dashboard-sync')
                        .send({
                            type:    'broadcast',
                            event:   'new_order',
                            payload: {
                                billId:      bill.billId,
                                total:       bill.total,
                                paymentMode: bill.paymentMode
                            }
                        });
                    console.log('Admin broadcast sent for:', bill.billId);
                } catch (broadcastErr) {
                    console.warn('Broadcast failed (non-fatal):', broadcastErr);
                }

                // Hand off to RawBT printer app
                printBill(bill);
            }

        }
    );

});

async function sendTrolleyAlert(){

    try{

        const { data, error } = await supabaseClient
        .from("alerts")
        .insert([
            {
                trolley_id: trolleyId,
                message: "⚠ No activity detected for 20 minutes"
            }
        ]);

        if(error){
            console.error("Alert error:", error);
        }else{
            console.log("Alert sent successfully");
        }

    }catch(err){

        console.error("Alert failed:", err);

    }

}
// ================= BILL =================

function generateBill() {

    const billId = "BILL-" + Date.now();
    // Store as ISO string — always parseable, timezone-safe
    // Display formatting is handled at render time
    const date = new Date().toISOString();

    let items = [];
    let total = 0;

    for (let code in cart) {
        const item = cart[code];
        const itemTotal = item.price * item.quantity;

        items.push({
            barcode: code,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            total: itemTotal
        });

        total += itemTotal;
    }

    return {
        billId,
        date,
        items,
        total,
        paymentMode: selectedPaymentMode,
        verified: "NO"
    };
}


async function saveBillToSupabase(bill) {

    const { data, error } = await supabaseClient
        .from("orders")
        .insert([
            {
                bill_id: bill.billId,
                total_amount: bill.total,
                payment_mode: bill.paymentMode,
                bill_date: bill.date
            }
        ]);

    if (error) {
        console.error("Supabase Insert Error:", error);
        alert("Database save failed");
        return false;
    }

    console.log("Saved to Supabase:", data);
    return true;
}

async function saveOrderItems(bill) {

    const rows = bill.items.map(item => ({
        bill_id: bill.billId,
        barcode: item.barcode,
        quantity: item.quantity
    }));

    const { error } = await supabaseClient
        .from("order_items")
        .insert(rows);

    if (error) {
        console.error("Order items save failed:", error);
    } else {
        console.log("Order items saved");
    }
}
// ================= RESET =================


function resetSystem() {

    scanningEnabled = true;
    cart = {};
    checkoutMode   = false;
    checkoutLocked = false;    // reset lock
    selectedPaymentMode = "";


    localStorage.removeItem("cartData");
    localStorage.removeItem("checkoutLocked");

    updateCart();

    paymentSection.style.display = "none";
    qrSection.style.display = "none";
    counterSection.style.display = "none";
    finishBtn.style.display = "none";
    finishBtn.disabled = false;
    finishBtn.textContent = "Finish Transaction";

    const printArea =
        document.getElementById("printArea");
        printArea.style.display = "none";
        printArea.style.innerHTML="";

    finishProcessing = false
}

// ================= LOCAL STORAGE =================

function saveCart() {
    localStorage.setItem("cartData", JSON.stringify(cart));
}

function loadCart() {
    const saved = localStorage.getItem("cartData");
    if (saved) {
        cart = JSON.parse(saved);
        updateCart();
    }
}

function saveBillOffline(bill) {
    let bills = JSON.parse(localStorage.getItem("offlineBills")) || [];
    bills.push({ ...bill, synced: false });
    localStorage.setItem("offlineBills", JSON.stringify(bills));
}

function markBillSynced(id) {
    let bills = JSON.parse(localStorage.getItem("offlineBills")) || [];
    bills = bills.map(b => {
        if (b.billId === id) b.synced = true;
        return b;
    });
    localStorage.setItem("offlineBills", JSON.stringify(bills));
}

// ================= CLOUD SYNC =================

async function sendBillToCloud(bill) {

    try {
        const formData = new FormData();
        formData.append("data", JSON.stringify(bill));

        const response = await fetch("https://script.google.com/macros/s/AKfycbz6AWUvTMWjhjAe_tfgbk_7G8dH8UUCbe3J_2dPNTI5dMW01a52yFrcTAKhko_ZD0roWw/exec", {
            method: "POST",
            body: formData
        });

        const result = await response.text();
        console.log("Server response:", result);

    } catch (error) {
        console.error("Cloud sync failed:", error);
    }
}

// ================= PRINT =================

function printBill(bill){

    let receipt = "";

    receipt += "SMART TROLLEY\n";
    receipt += "------------------------\n";
    receipt += "Bill: " + bill.billId + "\n";
    receipt += bill.date + "\n";
    receipt += "------------------------\n";

    bill.items.forEach(item=>{
    receipt += item.name + "\n";
    receipt += item.quantity + " x " + item.price + " = " + item.total + "\n";
    });

    receipt += "------------------------\n";
    receipt += "TOTAL: " + bill.total + "\n";
    receipt += "PAYMENT: " + bill.paymentMode + "\n";
    receipt += "------------------------\n";
    receipt += "Thank You\n\n\n";

    let encoded = btoa(receipt);

    window.location.href = "rawbt:base64," + encoded;

}


function setLanguage(lang) {

    localStorage.setItem("selectedLanguage", lang);

    const modal = document.getElementById("languageModal");
    if (modal) modal.style.display = "none";

    // English — no translation needed
    if (lang === "en") return;

    const interval = setInterval(() => {

        const select = document.querySelector(".goog-te-combo");

        if (select) {
            select.value = lang;
            select.dispatchEvent(new Event("change"));
            clearInterval(interval);
        }

    }, 300);
}


document.addEventListener("DOMContentLoaded", function () {

    const manualInput = document.getElementById("manualBarcode");
    const manualBtn = document.getElementById("manualAddBtn");

    if (manualBtn && manualInput) {

        manualBtn.addEventListener("click", function () {

            const code = manualInput.value.trim();

            if (!code) {
                alert("Enter barcode");
                return;
            }

            if (!productMap[code]) {
                alert("Product not found");
                return;
            }

            addItem(code);
            manualInput.value = "";
        });

    }

});
// ================= NETWORK =================

window.addEventListener("online", async () => {
    let bills = JSON.parse(localStorage.getItem("offlineBills")) || [];
    for (let bill of bills) {
        if (!bill.synced) await sendBillToCloud(bill);
    }
});

// ── Robot Language Selector ──────────────────────────────

function revealLanguageUI() {

    // 1. Hide the start button
    const hint = document.getElementById("lrTapHint");
    if (hint) {
        hint.style.opacity = "0";
        hint.style.pointerEvents = "none";
        setTimeout(() => hint.style.display = "none", 300);
    }

    // 2. Show bubble
    const bubble = document.getElementById("lrBubble");
    if (bubble) {
        bubble.style.display = "block";
        bubble.style.opacity = "0";
        bubble.style.transform = "translateY(12px)";
        bubble.style.transition = "opacity 0.4s ease, transform 0.4s ease";
        setTimeout(() => {
            bubble.style.opacity = "1";
            bubble.style.transform = "translateY(0)";
        }, 50);
    }

    // 3. Show language buttons after bubble
    setTimeout(() => {
        const buttons = document.getElementById("lrButtons");
        if (buttons) {
            buttons.style.display = "flex";
            buttons.style.flexDirection = "column";
            buttons.style.opacity = "0";
            buttons.style.transform = "translateY(12px)";
            buttons.style.transition = "opacity 0.4s ease, transform 0.4s ease";
            setTimeout(() => {
                buttons.style.opacity = "1";
                buttons.style.transform = "translateY(0)";
            }, 50);
        }
    }, 250);

    // 4. Play audio — runs inside a real user click so browser always allows it
    const audio = document.getElementById("langAudio");
    if (audio) {
        audio.currentTime = 0;
        audio.playbackRate = 1.5;
        audio.play().catch(err => console.warn("Audio blocked:", err));
    }
}

function selectLang(lang) {
    localStorage.setItem("selectedLanguage", lang);

    // Stop audio
    const audio = document.getElementById("langAudio");
    if (audio) { audio.pause(); audio.currentTime = 0; }

    // Fade out overlay
    const overlay = document.getElementById("langRobotOverlay");
    if (overlay) {
        overlay.style.transition = "opacity 0.4s ease";
        overlay.style.opacity = "0";
        setTimeout(() => overlay.style.display = "none", 400);
    }

    // English — just close the popup, no translation needed
    if (lang === "en") return;

    // Hindi / Marathi — apply Google Translate
    const interval = setInterval(() => {
        const select = document.querySelector(".goog-te-combo");
        if (select) {
            select.value = lang;
            select.dispatchEvent(new Event("change"));
            clearInterval(interval);
        }
    }, 300);
}

window.addEventListener("load", () => {

    const savedLang = localStorage.getItem("selectedLanguage");

    if (savedLang) {
        // Returning user — hide robot instantly
        const overlay = document.getElementById("langRobotOverlay");
        if (overlay) {
            overlay.style.transition = "none";
            overlay.style.opacity = "0";
            overlay.style.visibility = "hidden";
            overlay.style.pointerEvents = "none";
        }

        // English — no translation, just close overlay and do nothing
        if (savedLang === "en") return;

        // Hindi / Marathi — apply saved translation
        setTimeout(() => {
            const select = document.querySelector(".goog-te-combo");
            if (select) {
                select.value = savedLang;
                select.dispatchEvent(new Event("change"));
            }
        }, 1000);

    } else {
        // First visit — bubble/buttons already hidden via display:none in HTML
        // onclick on the button calls revealLanguageUI() directly
    }
});