import * as mupdf from 'mupdf';

interface RenderPdfOptions {
    onDocument?: (info: {
        title: string | null;
        pages: number;
    }) => void;

    onPage?: (info: {
        page: number;
        totalPages: number;
        width: number;
        height: number;
        fileSize: number;
        image: Buffer;
    }) => Promise<void> | void;

    onEnd?: () => Promise<void> | void;
}

export async function renderPdf(
    pdfBuffer: Buffer,
    options: RenderPdfOptions = {}
) {
    const doc = mupdf.Document.openDocument(
        pdfBuffer,
        'application/pdf'
    );

    try {
        const totalPages = doc.countPages();

        const title =
            doc.getMetaData('info:Title') || null;


//     title: doc.getMetaData('info:Title'),
//     author: doc.getMetaData('info:Author'),
//     subject: doc.getMetaData('info:Subject'),
//     creator: doc.getMetaData('info:Creator'),
//     producer: doc.getMetaData('info:Producer'),

        // Available immediately after opening PDF
        options.onDocument?.({
            title,
            pages: totalPages
        });

        for (let i = 0; i < totalPages; i++) {
            const page = doc.loadPage(i);

            const pageSize = page.getBounds();

                // const width = pageSize[2] - pageSize[0];
                // const height = pageSize[3] - pageSize[1];
                const pixmap = page.toPixmap(
                        mupdf.Matrix.scale(96 / 72, 96 / 72),
                        mupdf.ColorSpace.DeviceRGB
                    );
                const imageWidth = pixmap.getWidth();
                const imageHeight = pixmap.getHeight();
                const image = Buffer.from(pixmap.asPNG());

                const fileSize = image.length;

            try {
                const pixmap = page.toPixmap(
                    mupdf.Matrix.scale(96 / 72, 96 / 72),
                    mupdf.ColorSpace.DeviceRGB
                );

                try {
                    const image = Buffer.from(pixmap.asPNG());

                    await options.onPage?.({
                        page: i + 1,
                        totalPages,
                        image,
                        width: imageWidth,
                        height: imageHeight,
                        fileSize,
                    });
                } finally {
                    pixmap.destroy();
                }
            } finally {
                page.destroy();
            }
        }

        options.onEnd?.()
    } finally {
        doc.destroy();
    }
}