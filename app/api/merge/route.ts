import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (files.length < 2) {
      return NextResponse.json(
        { error: "At least 2 PDF files are required." },
        { status: 400 }
      );
    }

    const merged = await PDFDocument.create();

    for (const file of files) {
      const buffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(buffer);
      const pages = await merged.copyPages(pdf, pdf.getPageIndices());
      pages.forEach((page) => merged.addPage(page));
    }

    const mergedBytes = await merged.save();
    const buffer = Buffer.from(mergedBytes);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="merged.pdf"',
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to merge PDFs. Make sure all files are valid PDFs." },
      { status: 500 }
    );
  }
}
