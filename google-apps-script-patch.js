// ── CHANGE 1: In doGet(), add this block after the checkPayment block ──────
// Replace this section:
//   if (e && e.parameter && e.parameter.action === 'checkPayment') { ... }
//   // Default: Return products
// With:

  if (e && e.parameter && e.parameter.action === 'checkPayment') {
    const sourceId = e.parameter.sourceId;
    const result = checkPaymentStatus(sourceId);
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // NEW: Return orders for Rider tab
  if (e && e.parameter && e.parameter.action === 'getOrders') {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Orders');
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Orders sheet not found' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    const data = sheet.getDataRange().getValues();
    const orders = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[1]) continue; // skip empty rows
      orders.push({
        orderId:        i + 1,          // row number (used for status update)
        orderNumber:    row[1]  || '',
        fullName:       row[2]  || '',
        email:          row[3]  || '',
        phone:          row[4]  || '',
        address:        row[5]  || '',
        city:           row[6]  || '',
        barangay:       row[7]  || '',
        paymentMethod:  row[8]  || '',
        paymentReference: row[9] || '',
        items:          row[10] || '',
        subtotal:       row[11] || '',
        deliveryFee:    row[12] || '',
        tax:            row[13] || '',
        total:          row[14] || '',
        status:         row[15] || '',
        playerId:       row[16] || '',
        orderType:      row[17] || '',
        landmark:       row[18] || '',
        coordinates:    row[19] || '',
        mapsLink:       row[20] || '',
        timestamp:      row[0]  ? row[0].toString() : ''
      });
    }
    return ContentService.createTextOutput(JSON.stringify({ success: true, orders }))
      .setMimeType(ContentService.MimeType.JSON);
  }

// ── CHANGE 2: In doPost(), add this at the top of the try block ────────────
// Right after:  const data = JSON.parse(e.postData.contents);
// Add:

    // Rider: update order status
    if (data.action === 'updateStatus') {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Orders');
      const rowNum = parseInt(data.orderId); // orderId is the row number
      if (rowNum >= 2) {
        sheet.getRange(rowNum, 16).setValue(data.status); // column P = status
        // If delivered, send push notification to customer
        if (data.status === 'Delivered') {
          const orderNumber = sheet.getRange(rowNum, 2).getValue();
          const playerId    = sheet.getRange(rowNum, 17).getValue();
          if (playerId) sendDeliveredPush(playerId, orderNumber);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }

// ── CHANGE 3: In doPost(), update appendRow ────────────────────────────────
// Replace the existing sheet.appendRow([...]) with:

    sheet.appendRow([
      timestamp,
      orderNumber,
      data.fullName        || '',
      data.email           || '',
      data.phone           || '',
      data.address         || '',
      data.city            || '',
      data.barangay        || '',
      data.paymentMethod   || '',
      paymentReference,
      data.items           || '',
      data.subtotal        || 0,
      data.deliveryFee     || 0,
      data.tax             || 0,
      data.total           || 0,
      initialStatus,
      data.playerId        || '',   // col Q  (index 16)
      data.orderType       || '',   // col R  (index 17) ← NEW
      data.landmark        || '',   // col S  (index 18) ← NEW
      data.coordinates     || '',   // col T  (index 19) ← NEW
      data.mapsLink        || '',   // col U  (index 20) ← NEW
    ]);
