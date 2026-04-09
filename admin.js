if (sessionStorage.getItem("adminLoggedIn") !== "true") {
    window.location.href = "admin-login.html";
}


const supabaseUrl = "https://nqjuqjrafhurzkudqcbn.supabase.co";
const supabaseKey = "sb_publishable_v6cpkfut0eEAlapT0g5Ojw_3ZVa-U8u";

const supabaseClient = window.supabase.createClient(supabaseUrl,supabaseKey);



// NOTE: The real alert subscription is set up inside startAlertListener()
// below, which is called from window.onload. This early block was a duplicate
// that caused a channel-name collision — it has been removed.
function showAlert(message){

    document.getElementById("alertText").textContent = message;

    document.getElementById("alertOverlay").style.display = "flex";

}

function closeAlert(){

    document.getElementById("alertOverlay").style.display = "none";

}

function notifyStaff(){

    alert("Staff has been notified");

    closeAlert();

}


function acknowledgeAlert(){

    alert("Staff notified!");

    closeAlert();

}
function logout() {
    sessionStorage.removeItem("adminLoggedIn");
    window.location.href = "admin-login.html";
    
}

function closeBill() {
    
    document.getElementById("billModal").style.display = "none";
}

function getProductName(barcode) {

    const product = products.find(
        p => String(p.barcode) === String(barcode)
    );

    return product ? product.name : "Unknown Product";
}

// Duplicate alerts-channel subscription removed — handled by startAlertListener() below.

function startAlertListener(){

    const channel = supabaseClient
    .channel("alerts-listener")

    channel
    .on(
        "postgres_changes",
        {
            event: "INSERT",
            schema: "public",
            table: "alerts"
        },
        (payload) => {

            console.log("ALERT RECEIVED:", payload);

            const alertData = payload.new;

            const message =
                "Trolley " + alertData.trolley_id + " inactive";

            showAlert(message);

        }
    )
    .subscribe((status) => {

        console.log("Realtime status:", status);

    });

}

// =================================================================
// FIX: Realtime subscription for the 'orders' table
// When billing.html inserts a new row into 'orders', this listener
// fires and re-runs loadDashboard() so the transaction table and
// revenue cards update automatically — no page refresh needed.
// =================================================================
function startOrdersListener() {

    supabaseClient
        .channel("orders-realtime")
        .on(
            "postgres_changes",
            {
                event:  "INSERT",
                schema: "public",
                table:  "orders"
            },
            (payload) => {
                console.log("New order received:", payload.new);
                scheduleDashboardReload(); // debounced — won't stack with broadcast
            }
        )
        .subscribe((status) => {
            console.log("Orders realtime status:", status);
        });

}


// ── Debounce: prevents multiple simultaneous loadDashboard() calls ──
let _dashboardDebounceTimer = null;
function scheduleDashboardReload() {
    if (_dashboardDebounceTimer) clearTimeout(_dashboardDebounceTimer);
    _dashboardDebounceTimer = setTimeout(() => {
        loadDashboard();
        _dashboardDebounceTimer = null;
    }, 400);
}

async function loadDashboard() {

    try {

        const { data, error } = await supabaseClient
            .from("orders")
            .select("*");

        if (error) {
            console.error("Supabase Error:", error);
            return;
        }

        displayOrders(data);
        calculateStats(data);

    } catch (err) {
        console.error("Dashboard Load Failed:", err);
    }
}

function calculateStats(data) {

    // Get today's date in local YYYY-MM-DD for comparison
    const now      = new Date();
    const todayStr = now.getFullYear() + "-" +
                     String(now.getMonth() + 1).padStart(2, "0") + "-" +
                     String(now.getDate()).padStart(2, "0");

    let totalRevenue    = 0;
    let totalCustomers  = 0;
    let onlinePayments  = 0;
    let offlinePayments = 0;

    data.forEach(order => {

        // ── Robust date parsing ────────────────────────────────────
        // bill_date may be stored as:
        //   ISO:    "2026-03-16T07:06:10.000Z"  → new Date() works perfectly
        //   Locale: "16/03/2026, 07:06:10"      → must be parsed manually
        //   US:     "3/16/2026, 07:06:10 AM"    → new Date() usually works
        let orderDateStr = "";
        try {
            let parsed = new Date(order.bill_date);

            if (!isNaN(parsed.getTime())) {
                // Valid date — convert to local YYYY-MM-DD
                orderDateStr = parsed.getFullYear() + "-" +
                               String(parsed.getMonth() + 1).padStart(2, "0") + "-" +
                               String(parsed.getDate()).padStart(2, "0");
            } else {
                // Locale format like "16/03/2026, 07:06:10"
                // Rearrange DD/MM/YYYY → YYYY-MM-DD so Date() can parse it
                const datePart = order.bill_date.split(",")[0].trim(); // "16/03/2026"
                const segments = datePart.split("/");
                if (segments.length === 3) {
                    // Could be DD/MM/YYYY or MM/DD/YYYY
                    // Use length heuristic: if first segment > 12 it must be DD
                    const a = parseInt(segments[0]);
                    const b = parseInt(segments[1]);
                    const c = parseInt(segments[2]);
                    let reParsed;
                    if (a > 12) {
                        // DD/MM/YYYY
                        reParsed = new Date(c, b - 1, a);
                    } else {
                        // MM/DD/YYYY
                        reParsed = new Date(c, a - 1, b);
                    }
                    if (!isNaN(reParsed.getTime())) {
                        orderDateStr = reParsed.getFullYear() + "-" +
                                       String(reParsed.getMonth() + 1).padStart(2, "0") + "-" +
                                       String(reParsed.getDate()).padStart(2, "0");
                    }
                }
            }
        } catch (e) {
            orderDateStr = "";
        }

        if (orderDateStr === todayStr) {
            totalCustomers++;
            totalRevenue += Number(order.total_amount) || 0;

            if (order.payment_mode === "Online") {
                onlinePayments++;
            } else if (order.payment_mode === "Offline") {
                offlinePayments++;
            }
        }
    });

    document.getElementById("totalRevenue").innerText   = "₹" + totalRevenue;
    document.getElementById("totalCustomers").innerText = totalCustomers;
    document.getElementById("onlinePayments").innerText = onlinePayments;
    document.getElementById("offlinePayments").innerText = offlinePayments;
}

async function showBill(billId){

    const { data, error } = await supabaseClient
        .from("order_items")
        .select("*")
        .eq("bill_id", billId);

    if(error){
        console.error(error);
        return;
    }

    const box = document.getElementById("billItems");

    if(!data || data.length === 0){
        box.innerHTML = "No items found";
        return;
    }

    box.innerHTML = data.map(item => {

        const name = getProductName(item.barcode);

        return `
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #30363d;">
            <span>${name}</span>
            <span>x${item.quantity}</span>
        </div>
        `;
    }).join("");

    document.getElementById("billModal").style.display = "flex";
}
function displayOrders(data) {

    const tableBody = document.getElementById("ordersTableBody");

    if (!tableBody) {
        console.error("ordersTableBody not found in HTML");
        return;
    }

    tableBody.innerHTML = "";

    // Sort newest first
    const sorted = [...data].sort((a, b) => new Date(b.bill_date) - new Date(a.bill_date));

    sorted.forEach(order => {

        // Format ISO date nicely for display
        let displayDate = order.bill_date;
        try {
            const d = new Date(order.bill_date);
            if (!isNaN(d.getTime())) {
                displayDate = d.toLocaleString('en-IN', {
                    day:    '2-digit',
                    month:  '2-digit',
                    year:   'numeric',
                    hour:   '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                });
            }
        } catch(e) {}

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${order.bill_id}</td>
            <td>${order.total_amount}</td>
            <td>${order.payment_mode}</td>
            <td>${displayDate}</td>
        `;

        row.style.cursor = "pointer";
        row.onclick = () => showBill(order.bill_id);

        tableBody.appendChild(row);
    });
}
async function downloadOrders() {

    const { data, error } = await supabaseClient
        .from("orders")
        .select("*");

    if (error) {
        alert("Error fetching data");
        return;
    }

    let csv = "bill_id,total_amount,payment_mode,bill_date\n";

    data.forEach(row => {
        csv += `${row.bill_id},${row.total_amount},${row.payment_mode},${row.bill_date}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "orders.csv";
    a.click();

    URL.revokeObjectURL(url);
}

// =================================================================
// BILLING CONFIRM LISTENER
// When the customer taps YES on the billing confirmation modal,
// app.js broadcasts a 'new_order' event on the 'dashboard-sync'
// Supabase channel. This listener catches it and immediately
// reloads the dashboard data -- no manual refresh needed.
// This fires BEFORE the billing page navigates away to RawBT,
// so the admin always gets the update in real time.
// =================================================================
function startBillingConfirmListener() {

    supabaseClient
        .channel('dashboard-sync')
        .on(
            'broadcast',
            { event: 'new_order' },
            (payload) => {
                console.log('Billing YES confirmed:', payload);
                scheduleDashboardReload(); // debounced — won't stack with DB listener
            }
        )
        .subscribe((status) => {
            console.log('BillingConfirm listener status:', status);
        });

}

// window.onload = loadDashboard;
window .onload = () => {
    loadDashboard();
    startAlertListener();
    startOrdersListener();          // listens to DB INSERT on orders table
    startBillingConfirmListener();  // listens to YES tap on billing modal
}