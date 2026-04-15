import { NextResponse } from "next/server";
import { createHash } from "node:crypto";

import { createServiceRoleClient } from "@/lib/supabase/server";

type MidtransWebhookPayload = {
  transaction_time?: string;
  transaction_status?: string;
  transaction_id?: string;
  status_message?: string;
  fraud_status?: string;
  payment_type?: string;
  order_id?: string;
  merchant_id?: string;
  status_code?: string;
  gross_amount?: string;
  signature_key?: string;
  settlement_time?: string;
  currency?: string;
};

function isValidMidtransSignature(payload: MidtransWebhookPayload) {
  const serverKey = process.env.MIDTRANS_SERVER_KEY || "";
  const orderId = String(payload.order_id || "");
  const statusCode = String(payload.status_code || "");
  const grossAmount = String(payload.gross_amount || "");
  const signatureKey = String(payload.signature_key || "").toLowerCase();

  if (!serverKey || !orderId || !statusCode || !grossAmount || !signatureKey) {
    return false;
  }

  const expected = createHash("sha512")
    .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
    .digest("hex")
    .toLowerCase();

  return expected === signatureKey;
}

function normalizeMidtransPaymentStatus(payload: MidtransWebhookPayload) {
  const transactionStatus = String(payload.transaction_status || "")
    .trim()
    .toLowerCase();
  const fraudStatus = String(payload.fraud_status || "")
    .trim()
    .toLowerCase();

  if (transactionStatus === "settlement") {
    return "paid";
  }

  if (transactionStatus === "capture") {
    return fraudStatus === "challenge" ? "challenge" : "paid";
  }

  return transactionStatus;
}

export async function POST(request: Request) {
  try {
    const supabase = createServiceRoleClient();
    const body = (await request.json()) as MidtransWebhookPayload;

    const orderId = String(body?.order_id || "").trim();
    const transactionStatus = normalizeMidtransPaymentStatus(body);

    if (!orderId || !transactionStatus) {
      return NextResponse.json(
        {
          message:
            "Payload tidak valid. order_id dan transaction_status wajib diisi.",
        },
        { status: 400 },
      );
    }

    if (!isValidMidtransSignature(body)) {
      return NextResponse.json(
        { message: "Signature Midtrans tidak valid" },
        { status: 401 },
      );
    }

    const { data: allRows, error } = await supabase
      .from("orders")
      .select("*")
      .eq("code", orderId);
  

    const { data: updatedRows, error: updateError } = await supabase
      .from("orders")
      .update({ payment_status: transactionStatus })
      .eq("code", orderId)
      .select("code");

    if (updateError) {
      console.error("Midtrans webhook update error:", updateError);
      return NextResponse.json(
        { message: "Gagal update status pembayaran" },
        { status: 500 },
      );
    }

    if (!updatedRows || updatedRows.length === 0) {
      return NextResponse.json(
        {
          message: "Order dengan order_id tidak ditemukan",
          order_id: orderId,
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        message: "Status pembayaran berhasil diperbarui",
        order_id: orderId,
        transaction_status: String(body.transaction_status || "")
          .trim()
          .toLowerCase(),
        payment_status: transactionStatus,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Midtrans webhook error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat memproses webhook" },
      { status: 500 },
    );
  }
}
