const EXEC_URL = "https://script.google.com/macros/s/AKfycbz6AWUvTMWjhjAe_tfgbk_7G8dH8UUCbe3J_2dPNTI5dMW01a52yFrcTAKhko_ZD0roWw/exec";

async function verifyBill() {

    const billId = document.getElementById("billInput").value.trim();
    const resultDiv = document.getElementById("result");

    if (!billId) {
        resultDiv.innerHTML = "Enter Bill ID";
        return;
    }

    try {
        const response = await fetch(EXEC_URL);
        if (!response.ok) throw new Error("Network issue");

        const bills = await response.json();

        const bill = bills.find(b => b.billId === billId);

        if (!bill) {
            resultDiv.innerHTML = "Bill not found";
            return;
        }

        if (bill.verified === "YES") {
            resultDiv.innerHTML = "<b>Already Verified</b>";
            return;
        }

        resultDiv.innerHTML = `
            <p>Total: ₹${bill.total}</p>
            <p>Payment: ${bill.paymentMode}</p>
            <button onclick="confirmVerification('${billId}')">Confirm Exit</button>
        `;

    } catch (error) {
        resultDiv.innerHTML = "Verification system offline";
    }
}
async function confirmVerification(billId) {

    const response = await fetch(EXEC_URL, {
        method: "POST",
        body: JSON.stringify({
            action: "verify",
            billId: billId
        })
    });

    const result = await response.json();

    if (result.status === "verified") {
        document.getElementById("result").innerHTML =
            "<h3 style='color:green'>Exit Approved</h3>";
    }
}



if (!navigator.onLine) {
    resultDiv.innerHTML = " Cannot verify offline";
    return
}