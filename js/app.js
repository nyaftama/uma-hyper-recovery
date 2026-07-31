document.addEventListener('DOMContentLoaded', () => {
    // Canvas & State
    const canvas = document.getElementById('previewCanvas');
    const ctx = canvas.getContext('2d');

    // Helper: Generate 10 randomized sparkle positions
    function generateRandomSparkles() {
        const sparkles = [];
        const count = 10;

        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 + (Math.random() * 0.4 - 0.2);
            const rx = 200 + Math.random() * 220;
            const ry = 55 + Math.random() * 75;

            const x = Math.cos(angle) * rx;
            const y = Math.sin(angle) * ry;

            const size = Math.round(14 + Math.random() * 26);
            const rot = Math.round((Math.random() - 0.5) * 90);

            sparkles.push({ x, y, size, rot });
        }
        return sparkles;
    }

    const state = {
        bgImage: null,
        imgRotation: 0, // 0, 90, 180, 270 degrees
        textLine1: '超回復',
        textKeyword: '温泉',
        onlyHyperRecovery: false,
        isCanvasLocked: false,
        textSize: 70,  // default 70
        textSlant: -8, // Fixed -8 deg slant
        aspectRatio: '3:2', // default 3:2
        posX: 50, // percentage 0 - 100
        posY: 75, // default 75%
        imgX: 0,  // percentage offset
        imgY: 0,  // percentage offset
        imgScale: 100, // percentage
        dragTarget: 'image', // default 'image'
        sparkles: generateRandomSparkles(),
        isDragging: false,
        dragStart: { x: 0, y: 0 }
    };

    // Aspect Ratio Definitions (Pattern A: short-side 600px based)
    const ASPECT_RATIOS = {
        '3:2': { width: 900, height: 600, label: '3:2 (横長)' },
        '16:9': { width: 1067, height: 600, label: '16:9 (横長)' },
        '4:3': { width: 800, height: 600, label: '4:3 (横長)' },
        '1:1': { width: 600, height: 600, label: '1:1 (正方形)' },
        '3:4': { width: 600, height: 800, label: '3:4 (縦長)' },
        '2:3': { width: 600, height: 900, label: '2:3 (縦長)' },
        '9:16': { width: 600, height: 1067, label: '9:16 (縦長)' }
    };

    // DOM Elements
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileInput');
    const pasteImgBtn = document.getElementById('pasteImgBtn');
    const rotateImgLeftBtn = document.getElementById('rotateImgLeftBtn');
    const rotateImgRightBtn = document.getElementById('rotateImgRightBtn');
    const resetImgBtn = document.getElementById('resetImgBtn');

    const aspectDropdown = document.getElementById('aspectDropdown');
    const aspectDropdownTrigger = document.getElementById('aspectDropdownTrigger');
    const aspectSelectedIcon = document.getElementById('aspectSelectedIcon');
    const aspectSelectedText = document.getElementById('aspectSelectedText');
    const aspectDropdownMenu = document.getElementById('aspectDropdownMenu');

    const textKeywordInput = document.getElementById('textKeyword');
    const textKeywordError = document.getElementById('textKeywordError');
    const presetChips = document.querySelectorAll('.preset-chip');
    const onlyHyperRecoveryCheckbox = document.getElementById('onlyHyperRecoveryCheckbox');
    const keywordInputGroup = document.getElementById('keywordInputGroup');
    const presetsWrapper = document.querySelector('.presets-wrapper');

    const canvasLockCheckbox = document.getElementById('canvasLockCheckbox');
    const canvasLockToggle = document.getElementById('canvasLockToggle');
    const canvasCard = document.querySelector('.canvas-card');

    // NG Words Filter State & Encoded Fallback
    let ngWords = [];
    let isNgWordDetected = false;

    const FALLBACK_NG_WORDS_B64 = "TlhFeU4wTjFZWFYxWjNKcVp6VkVhbWMxUkdwbmNVbExOVXh4U1RWaU5rMDFUR2xPTmtsdGRrTjFZVUZ4ZFdGSmExRnlhM1ZKZG0xcFdYTkxORFJMYVRRMFQzbzBORTlDUTNWdGJtaFBiVzF5UVhKc2FHRjJibTFpTjNCc1ltTkxObUZsUlRWTU1tTkRkVTlEY1hWUFJISXJUME56SzA5RWMzZHlibWR2TjJ0MVNXOUxOV0UyZWpWdlMzRkRkV1Y1YkN0WFZHZFJjbXBuY2xScVp6VTRTelEwUzNZME5FczVRM1ZQUW1vclQwSnVVWEpzY25KTlN6Wk1SMkZEZFU5RGNtVlBSRzluY25CdE5VaHdjbHB2U3pRMFQxazBORXRyTkRSUFNVTjFZVnByWjNKcVozRnFhbWMyTUVzME5FdHZORFJQUkRRMFQwSkRkV0ZCY0hkeWFtZHlkbXBuTkZCcVozRXZhbWR5YTBzME5FZG9ORFJMVkRRMFIxUkRkVTlDYjJWUFEyc3JUMEp2WlU5RGEzZHlhbWRpTjJwbmNGQnFaMXBOU3pRMFIwczBORWRxTkRSSGVEUTBSMFZEZFZjemNVOVROWE4zY210MVlrMUxOV0pETjBOMVQwUnNaVTlEY0N0UFJIRlJjbTFwV1hacVozSlFhbWR4TUVzMWNIbHpOVFZYY1VOMWJXbHhUMU12YkhkeWEzVkxNMnhvTjNKcVoxcGpTelZ5TW5VMVdrTTFORFJIVGtOMVpYbDJkV0V5YzJkeWJuTnlOMnh5V2tGTE5EUkxjVFEwVDBzME5FOU1ORFJQT0VOMWFVaHhkV0ZHYzBGeWJtcExXRzl3VEhOTE5EUkxVRFEwUjBVME5FZGlORFJIYTBOMVYwaHdkVmRzYzNkeWJuRTJXRzl6Y0RSTFVWWlpTelEwVDNNME5FdHJORFJQV0VOMVlUTnhLMU0xYzFGeWJHODNURzF0UzFWTE5reExNelZ3YVd4RGFtZDRUVUZ2ZUUxVVVURk5WRkZMVFZScmVFOVJjbkBvTkRkdWFtRk5TelZ5WlhJMVlWTnBRM1ZYUm1sUGFUaHhVWEp1YkV4RWJXbFpRVXMyV1Vkbk5sbGxUME4xVDBOd1QwOUVjeXRQUkc5QmNtcG5ObFJxWjNKcWFtYzJXR3BuY1ZsTE5EUkxOelEwVDNvME5FOVNORFJMYTBOMVQwTjJLMDlFYVdWUFEzTXJUMFJ5VVhKcVp6UnFhbWR4Y21wbk5EUkxORFJMYXpRMFMzUTBORXM1TkRSTGJVTjFUMFJ4VDA5RGRFOVBSR3hsVDBSeGRVOUVjQ3RQUTNCbmNtcG5ObFJxWjNGeWFtYzBTR3BuTm1acVozRlpTelEwUzNRME5FOXVORFJQVERRMFQydzBORXR0UTNWUFJHaDFUME56SzA5RGNsRnlhbWMxZG1wbkN1QnFaelZFYW1jM1RVczBORTlXTkRSTGJUUTBTeXMwTkV0MlEzVlBSR2wxVDBOeEswOUVaMDlQUTNSM2NtcG5jbVpxWjNGeWFtYzFXR3BuY1RCTE5EUkxOelEwUzJzME5FdHZORFJMZEVOMVQwTjFLMDlEY0U5UFEzUjNjbXBuY21acVp6Wm1hbWR5YW1wbk5tTkxORFJQU2pRMFMyMDBORTlITkRSTGEwTjFUMEpvVDA5RGF5dFBRMmRCY21wbmIxUnFaMXBxYW1kdldHcG5XVmxMTkRSSFlqUTBTMVEwTkVkNE5EUkhSVU4xVDBKdUswOUNjV1ZQUW1zclQwTnFVWEpxWjJGcWFtZFpjbXBuYVRSTEU1RFJIUlRRMFIwNDBORTRrTkRSSFJPTjFUME5wVDA5Q2JFOVBQbVJsVDBOcGRVOURhQ3RQUW1obmNtcG5iMVJxWjFseWFtZGhTR3BuYjJacVoxbFpTelEwUjA0ME5FdElORFJIZGpRMFMwWTBORTdIUjNWUFFuQjFUMEpuSzA5Q2FsRnlhbWRpZG1wbk5GVkxORFJIMkprRWFtZHdUVXMwTkVjeE5EUkhSelEwUjJVMk5FZFFRM1ZQUW5GMVQwSnBLMDlDYjA5UFFteDNjbXBuV21acVoxbHlhbWRpV0dwbldUQkxORFJIZWpRMFIwVTBORWRKTkRSSFRrTjFUMEp0SzA5Q2FFOVBRbXgzY21wbldtWnFaMjltYW1kYWFtcG5iMk5MTkRSSGNEUTBSMGMwTkVkdE5EUkhSVU50V2pGWk1uTkxXbTVXYW1FeWJIVmFkM0J0WkZkT2NscFlTVXRqTW1od1pFRndhV0ZZVW1waFFYQjZZa2hXTUVOdVpHOWlNMHBzUTIxS2FHTXpVbWhqYlZGTFdWaE9lbUZIT1hOYVVYQnFaRmMxTUVOdFVuQlpNbk5MWTBoV2VtTXphMHRaTWpscVlYZHdkMXBYTlhCamQzQXlXVmRrY0dKdFJVdFpiVGwyV1c1TlMySlhiaE5hWjNCcllWZDRhMkozY0hkaU0wcDFRMjVDZG1OdE5YWkRIV2hzWW01U2FHRlJjSHBhV0dkTFl6SldOR1ZSY0hWa1YxSnNRMjAxYUdFeVZtdERiVVoxV1ZkM1MySXpTbTVaV0U1MFEyMU9NV0pSY0hSWldFNHdaRmhLYVZsWVVteERiVlo1WWpOU2NGbDNjSEpoVjNoelEyMHhNV050VW14alozQjZaRmRzYW1GWFVteERiVkpzV1ZoU2IwTnVVbXhqYmtwMlljMXNlbVJCY0hWWldIQndRMjAxY0ZveVpHeGpaM0IxWVZka2JsbFJjRzFaVjJSdVlqTlJTMk50VmpCWldFcHJRM1ZQUTI5MVQwUnBkVTlFV1hkcmFtZFpUR3BuWVhKcVoyOXpTelEwUzJrME5FOUxORFJQVERRMFR6aERkVTlDWjNWUFFuRjFUMEp4SzA5RWRrRnlhbWMxY21wbk5IWnFaM0pyU3pRMFJ6WTBORWR5TkRSSFdrTjFUMFIwVDA5RGIyVlBRM0oxVDBScFozSnFaelZFYW1keE4ycG5ORzlMTkRSRGR6UTBSMDg0TkVkeFEzVlBRM0lyVDBSeGRVOUVheTlQUkdGMVQwTjFVWEpxWjFrdmFtZHZjbXBuWVdwcVoyOXlhbWRhYTBzME5FZG9ORFJMVkRRMFIzbERkVTlDYjJWUFEyc3JUMEp6WlU5Q2EzZHlhbWMwU0dwbk4xQnFaenV3U3pRMFQwSTBORTkyTkRSTFpEUTBTM3BEZFU5RVozVlBSSE1yVDBSVVVYSnFaMWx5YW1kaU4ycG5jRkJxWjFwTlN6UTBTM0UwTkU5bE5EUlBlalEwUzNwRERVOUViblZQUkhNcjQwUnVVWEpxWjFseWFtZGhTR3BuY0ZCcVoyRklhbWR3VFVzME5FdHhORFJQUWpRMFQzbzBORTlDTkRSUGVrbjFiVnB6VDIxRWNVRnlhbWRaVkdwbjNGQnFaMkpKU3pWdlEyNDFXbTF2UTNWUFFtMHJUMEpvVDA5Q2FsRnlhbWMxU0dwbmNWUnFaelZJYW1jM1RVczBORTlDTkRSSFJUUTBSSWcwTkV0VVFtVmxtRzFQYVVOdlVYSnFaMXB1YW1kaU4ycG5XamhMTkRSTFZUUTBUMlUwTkVzdlEzVlBSSEpsVDBSMlQwOURpdFBSSFpCY21wbGJ6TnFaemQ2YW1kYUwycG5OM2RMTldKRFJUVTNEeXREQ1U5Q2JDdFBRMmNyVDBKdEswOUNhRUZ5Ym0xaWNtMW5ORlZMTkRSSGRqUTBSMnMwTkVkWk5EUkxTRFEwUjBkRGRWZHJhV1ZoUm1sM2NtcG5ZbXBxWjNCUWFtZGFMMnBuV1ZGTE5EUlBkTFEwVDNGRGRVOURnQ3RQUkhBclQwTjJkM0pxWjI4emFtZHZiMHMwTkVkWU5EUkxTRFEwUjJaRGRXMWpjM1ZYU0hWbmNtcG5iejNxWjFwbWFtZHZXR3BuWVZGTE5Wa3llalZpUXpaRGRVOURibVZQUTBvclQwSnNLMDlEWXRQUW1wM2NtcG5jVlJxWnpadWFtYzFOMnBuTkVocVozRnZTelEwUjBVME5FdEtORFJIS3pRMFIyZzBORWRMUTNWUFEzQlBUMFJ4WlU5RWJtZHlhbWMxU0dwbmNWUnFaM0p5YW1jMmIwczBORWQ0TkRSSFJUUTBSMkUwTkV0TFEzVlBRM0lyVDBSekswOUVhWGR5YW1kWkwycG5jRkJxWjJGelN6UTBUMGcwTkV0cU5EUlBPRFEwVDFnME5FczFORFJQZERRMFR6ZzBORTlKUTNWUFFuQXJUMEpuSzA5RWRrOVBRblFyVDBKdFpVOURhbVZQUkhaUFQwSnhRWEpxWjNKMmFtZHhMMnBuTmpOcVozSnJTelEwUjJJME5FZFFORFJMVGpRMFIxcERkVTlEZEN0UFEzTXJUME4wSzA5RGMzZHlhbWRhWm1wbldsQnFaMXBtYW1kYVRVczBORXN6TkRSTGVqUTBTMHREZFU5Q2JDdFBRbXNyVDBOcFozSnFaMkppYW1kaFVHcG5XWFpxWjFwRlN6UTBUMWMwTkU5RU5EUkxjalEwUzNoRGRXVnZjblZUTjIxUFQwSnJVWEpxWjFvdmFtZGhNMnBuWVZScVoxcEZTelEwUzNFME5FOUxORFJQWVRRMFQwUTBORTlKUTNWUFFtbDFUMEp4ZFU5Q2RYVlBRbThyVDBKeFFYSnFaM0pRYW1jM1VHcG5ORzVxWnpkNmFtYzJRVXMwTkVkVU5EUkxWRFEwUjNBME5FODRORFJMUVVOMVQwUnZaVTlEZFdWUFEzSlBUME55VVhKcVoyOUlhbWRhYm1wbldYcHFaMWt3U3pVMVpUQTFjbmxwUTNWUFFtOWxUMEpwSzA5RGEzZHlhbWMwU0dwbmNYWnFaemROU3pVMWRWZzFjRXQxUTNWUFFuRlBUMEpvZFU5Q2JHVlBRbkJCY214eGNISnZiSEYzU3pRMFIzbzBORXRGTkRSSFVFTjFiVnAwWldrcmMxRnlhbWR2Y21wbmIyWnFaMWxpYW1kYWFtcG5iMlpxWjFrNFN6WkxjUzgxY0ZkYVEzVlBRbTlsVDBOb0swOUNhSFZQUW1wbFQwTm9LMDlDYUdkeWJIQmlWSEJ0Y21OTE5EUkhjRFEwUzAwME5FZEZRM1ZsTTJsMVpUUnRkM0pxWjFremFtZHdVR3BuWWtScVoxazRTelpNSzFJMlMyRnhOVFYxTkRWaFpXMURkVTlDYW1WUFEyc3JUMEpzSzA5RGF5dFBRbTVsVDBKb2RVOUNhU3RQUTJ0M2NtcG5ZbGhxWjFsbWFtZHZhMHMxYjIxTU5EUlBaVFEwVDNwRGRVOUNjSFZQUW5aMVQwTnJkM0pxWnpSaWFtYzFOMnBuTjAxTE5XOTVTRFEwVDJVME5FOTZRM1ZQUTJoMVQwSnpLMDlDZG5WUFEydDNjbXBuTm1KcVp6VlFhbWMxTjJwbk4wMUxORFJMYlRRMFQyVTBORXN6TkRSTGVrTjFUMEpvZFU5Q2RuVlBRbXdyVDBKcmQzQXhZbGhPY2tOMVpYbDJkV1ZzYm5WdFlXNVBWM1Z6ZDNKcVozSjJhbWR4VkdwbmNtWnFaemRRYW1keVptcG5ObVpxWjNGaWFtZHhlbXBuY1ZGTE5EUkhZalEwUjBVME5FZFlORFJMVkRRMFIxZzBORXRJTkRSSFJ6UTBSMDAwTkVkRlEzVmxlWFoxWld4dWRXVllhRkZ5YW1keWRtcG5jVlJxWjNKbWFtYzNVR3BuTlZCcVp6Wm1hbWR4V1VzME5FZGlORFJIUlRRMFIxZzBORXRVTkRSSGVqUTBTMGcwTkVkSFEzVmxlWFoxWld4dWRXVlhkblZoUTI5M2NtcG5jblpxWjNGVWFtZHlabXBuTjFCcVozSm1hbWMwVUdwbmNYWnFaemROU3pRMFIySTBORWRGTkRSSFdEUTBTMVEwTkVkWU5EUkhhalEwUjB3ME5FdFVRM1ZsWm5CbFpXRm9UMjFoYms5WGRYTjNjbXBuTkVocVp6UmlhbWR4TTJwbmNtWnFaelptYW1keFltcG5jWHBxWjNGUlN6UTBSMmcwTkVkdE5EUkhUalEwUjFnME5FdElORFJIUnpRMFIwMDBORWRGUTNWbFpuQmxiV0Z1UVhKcVp6UklhbWR5Wm1wbk5tWnFaM0ZaU3pRMFIyZzBORWRZTkRSTFNEUTBSMGREZFdWYWRYVnRRbXhQYldGdVQxZDFjM2R5YW1jMEwycG5ORkJxWjNJdmFtYzBWR3BuY21acVp6Wm1hbWR4WW1wbmNYcHFaM0ZSU3pRMFIzWTBORWRxTkRSSFpqUTBSMnMwTkVkWU5EUkxTRFEwUjBjME5FZE5ORFJIUlVOMWFUWnhLMU01YXl0dFlXNVBWM1Z6ZDNKcVozSm1hbWMzVUdwbmNpOXFaM0ZVYW1keVptcG5ObVpxWjNGaWFtZHhlbXBuY1ZGTE5EUkhXRFEwUzFRME5FZG1ORFJIUlRRMFIxZzBORXRJTkRSSFJ6UTBSMDAwTkVkRlEzVnBObkVyYldGdVFYSnFaM0ptYW1jM1VHcG5jbVpxWnpabWFtZHhXVXMxTjFkNE5WcERTVFZoVTNnMlMzRXZRM1ZQUkdsUFQwTndkVTlEZEU5UFEzQjFUME4wSzA5RVp5dFBSR2RsVDBSd0swOURjR2R5YW1kaGFtcG5XV0pxWjFwVWFtZFpZbXBuV21acVoyRlFhbWRoU0dwbmIyWnFaMWxaU3pVM3N5czFObGRsTlZscFJ6WkxUME5EZFU5RGRTdFBRM0JQVDBOMEswOUVjeXRQUkd4MVQwUnpLMDlFY2s5UFJHaEJjbXBuV25acVoxbFVhbWRaWm1wbmNGQnFaMkppYW1kd1VHcG5iM3BxWjJGUlN6Wk1jVUkyWVhsNFEzVnBObWRsVDBKb2RVOUNjRUZ5YW1keU0ycG5jV0pxWjNGaWFtYzBVVXMwTkVka05EUkhSelEwUjBjME5FZHJRM1ZUTnZWMVlXZDJUMjFoYms5WGRYTjNjbXBuY21wcVp6ZFFhbWR4ZG1wbmNTOXFaM0ptYW1jMlptcG5jV0pxWjNGNmFtZHhVVXMwTkVkWk5EUkxWRFEwUjB3ME5FZFFORFJIV0RRMFMwZzBORWRITkRSSFRUUTBSMFZEZFdseGFtVmxabkJsWlZob2QzSnFaelIyYW1jM1VHcG5ORWhxWjNKbWFtYzJabXBuY1ZsTE5EUkhjalEwUzFRME5FZG9ORFJIV0RRMFMwZzBORWRIUTNWbFdIUlBWMUpvWjNKcVp6UklhbWMxZG1wbmNWbExORFJIYURRMFR6YzBORWRIUTNWbFRHZDFVeloxWjNKcVozRXphbWMyWm1wbmNXSnFaM0pxYW1jM3RVczBORWRPTkRSTFNEUTBSMGMwTkVkWk5EUkxWRU4xWVhkc0syMUNiR1ZQUW1oQmNtMXpTbVp1YVRSTWFtZFpVVXMxV2lzMk5WcDVkelZoVTFkRGRVOURjbVZQUkdkbFQwTnlUMDlEY0VGeWFtZFpNMnBuWVVocVoxbDZhbWRaVVVzME5FdHpORFJMYXpRMFN6UkRkVTlDYWs5UFFtaFBUMEp0UVhKdGMyRkViWE55ZDBzME5FdHlORFJMTHpRMFQzWkRkVTlDYVN0UFFtNHJUME5xZHowOQ==";

    function decodeTripleBase64(b64Str) {
        try {
            const cleanStr = String(b64Str).replace(/\s+/g, '');
            const pass1 = atob(cleanStr).replace(/\s+/g, '');
            const pass2 = atob(pass1).replace(/\s+/g, '');
            const pass3Binary = atob(pass2);
            const bytes = new Uint8Array(pass3Binary.length);
            for (let j = 0; j < pass3Binary.length; j++) {
                bytes[j] = pass3Binary.charCodeAt(j);
            }
            return new TextDecoder('utf-8').decode(bytes);
        } catch (e) {
            console.warn('Failed to decode Base64:', e);
            return '';
        }
    }

    async function loadNgWords() {
        let loadedText = '';
        try {
            const response = await fetch('data/ng_words.txt');
            if (response.ok) {
                const rawText = await response.text();
                loadedText = decodeTripleBase64(rawText);
            }
        } catch (err) {
            console.warn('Could not fetch ng_words.txt:', err);
        }

        if (!loadedText) {
            loadedText = decodeTripleBase64(FALLBACK_NG_WORDS_B64);
        }

        if (loadedText) {
            ngWords = loadedText
                .split(/\r?\n/)
                .map(w => w.trim())
                .filter(w => w.length > 0 && !w.includes('\uFFFD'));
        }

        validateKeywordInput();
    }

    function normalizeText(str) {
        if (!str) return '';
        // NFKC normalization (converts half-width kana to full-width, etc.)
        let normalized = str.normalize('NFKC').toLowerCase();
        // Convert Katakana (U+30A1 - U+30F6) to Hiragana (U+3041 - U+3096)
        return normalized.replace(/[\u30a1-\u30f6]/g, (ch) => {
            return String.fromCharCode(ch.charCodeAt(0) - 0x60);
        });
    }

    function hasEmoji(str) {
        if (!str) return false;
        try {
            if (/\p{Extended_Pictographic}/u.test(str)) {
                return true;
            }
        } catch (e) { }

        const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}\u{2300}-\u{23FF}]/u;
        return emojiRegex.test(str);
    }

    function validateKeywordInput() {
        if (state.onlyHyperRecovery) {
            isNgWordDetected = false;
            if (textKeywordInput) {
                textKeywordInput.classList.remove('input-error');
                if (textKeywordError) textKeywordError.style.display = 'none';
            }
            renderCanvasSafe(50);
            return false;
        }

        const text = textKeywordInput ? textKeywordInput.value : '';
        let matchedNg = false;
        let matchedEmoji = false;

        if (text && text.trim().length > 0) {
            matchedEmoji = hasEmoji(text);

            if (!matchedEmoji && ngWords.length > 0) {
                const normalizedText = normalizeText(text);
                for (const word of ngWords) {
                    const normalizedWord = normalizeText(word);
                    if (normalizedWord && normalizedText.includes(normalizedWord)) {
                        matchedNg = true;
                        break;
                    }
                }
            }
        }

        const isError = matchedEmoji || matchedNg;
        isNgWordDetected = isError;

        if (textKeywordInput) {
            const errorSpan = textKeywordError ? textKeywordError.querySelector('span') : null;
            if (isError) {
                textKeywordInput.classList.add('input-error');
                if (textKeywordError) {
                    textKeywordError.style.display = 'flex';
                    if (errorSpan) {
                        if (matchedEmoji) {
                            errorSpan.textContent = '絵文字は使用できません';
                        } else {
                            errorSpan.textContent = 'エラーが発生しました';
                        }
                    }
                }
            } else {
                textKeywordInput.classList.remove('input-error');
                if (textKeywordError) textKeywordError.style.display = 'none';
            }
        }

        renderCanvasSafe(50);
        return isError;
    }

    const textSizeInput = document.getElementById('textSize');
    const textSizeVal = document.getElementById('textSizeVal');
    const posYInput = document.getElementById('posY');
    const posYVal = document.getElementById('posYVal');
    const posXInput = document.getElementById('posX');
    const posXVal = document.getElementById('posXVal');
    const imgScaleInput = document.getElementById('imgScale');
    const imgScaleVal = document.getElementById('imgScaleVal');
    const dragTargetRadios = document.querySelectorAll('input[name="dragTarget"]');

    const shuffleSparklesBtn = document.getElementById('shuffleSparklesBtn');
    const resetBtn = document.getElementById('resetBtn');
    const generateBtn = document.getElementById('generateBtn');

    const shareModal = document.getElementById('shareModal');
    const shareStep1 = document.getElementById('shareStep1');
    const shareImagePreview = document.getElementById('shareImagePreview');
    const downloadModalBtn = document.getElementById('downloadModalBtn');
    const twitterShareBtn = document.getElementById('twitterShareBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const copyImageBtn = document.getElementById('copyImageBtn');

    // Default Canvas Dimensions
    const CANVAS_WIDTH = 900;
    const CANVAS_HEIGHT = 600;

    function updateCanvasDimensions(aspectKey) {
        const config = ASPECT_RATIOS[aspectKey] || ASPECT_RATIOS['3:2'];
        state.aspectRatio = aspectKey;

        canvas.width = config.width;
        canvas.height = config.height;

        textCacheCanvas.width = config.width;
        textCacheCanvas.height = config.height;

        markTextCacheDirty();
    }

    // Aspect Ratio Dropdown Interaction
    if (aspectDropdownTrigger && aspectDropdown) {
        aspectDropdownTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = aspectDropdown.classList.contains('open');
            if (isOpen) {
                aspectDropdown.classList.remove('open');
                aspectDropdownTrigger.setAttribute('aria-expanded', 'false');
            } else {
                aspectDropdown.classList.add('open');
                aspectDropdownTrigger.setAttribute('aria-expanded', 'true');
            }
        });

        document.addEventListener('click', (e) => {
            if (!aspectDropdown.contains(e.target)) {
                aspectDropdown.classList.remove('open');
                aspectDropdownTrigger.setAttribute('aria-expanded', 'false');
            }
        });

        if (aspectDropdownMenu) {
            const items = aspectDropdownMenu.querySelectorAll('.dropdown-item');
            items.forEach(item => {
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const chosenAspect = item.getAttribute('data-aspect');
                    if (chosenAspect && ASPECT_RATIOS[chosenAspect]) {
                        items.forEach(i => {
                            i.classList.remove('active');
                            i.setAttribute('aria-selected', 'false');
                        });
                        item.classList.add('active');
                        item.setAttribute('aria-selected', 'true');

                        const itemSvg = item.querySelector('svg');
                        const itemSpan = item.querySelector('span');
                        if (itemSvg && aspectSelectedIcon) {
                            aspectSelectedIcon.innerHTML = itemSvg.outerHTML;
                        }
                        if (itemSpan && aspectSelectedText) {
                            aspectSelectedText.textContent = itemSpan.textContent;
                        }

                        aspectDropdown.classList.remove('open');
                        aspectDropdownTrigger.setAttribute('aria-expanded', 'false');
                        updateCanvasDimensions(chosenAspect);
                        renderCanvasSafe(0);
                    }
                });
            });
        }
    }

    // --- Toast Notification (Matched exactly with uma-ouen-baken) ---
    let toastTimeout;
    function showToast(msg, duration = 2500) {
        const toast = document.getElementById('toast');
        if (!toast) return;
        toast.textContent = msg;
        toast.classList.add('show');
        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => toast.classList.remove('show'), duration);
    }

    // Offscreen Canvas Cache for Text Rendering Optimization
    const textCacheCanvas = document.createElement('canvas');
    textCacheCanvas.width = CANVAS_WIDTH;
    textCacheCanvas.height = CANVAS_HEIGHT;
    const textCacheCtx = textCacheCanvas.getContext('2d');
    let isTextCacheDirty = true;

    function markTextCacheDirty() {
        isTextCacheDirty = true;
    }

    // WebFont Loading Safety Wrapper
    let fontLoadTimer = null;
    function renderCanvasSafe(delay = 100) {
        markTextCacheDirty();
        if (fontLoadTimer) clearTimeout(fontLoadTimer);
        fontLoadTimer = setTimeout(() => {
            if (document.fonts && document.fonts.ready) {
                document.fonts.ready.then(() => {
                    renderCanvas();
                }).catch(() => {
                    renderCanvas();
                });
            } else {
                renderCanvas();
            }
        }, delay);
    }

    // --- Render Text & Sparkles to Offscreen Cache ---
    function renderTextToCache() {
        textCacheCtx.clearRect(0, 0, textCacheCanvas.width, textCacheCanvas.height);

        textCacheCtx.shadowColor = 'transparent';
        textCacheCtx.shadowBlur = 0;
        textCacheCtx.shadowOffsetX = 0;
        textCacheCtx.shadowOffsetY = 0;

        const centerX = textCacheCanvas.width / 2;
        const centerY = textCacheCanvas.height / 2;
        const baseSize = state.textSize;
        const fontStack = "'Noto Sans JP', -apple-system, sans-serif";

        function drawTextLayers(text, font, xOffset, yOffset, size, gradientStops) {
            textCacheCtx.font = font;

            const gradHeight = size * 0.95;
            const textGrad = textCacheCtx.createLinearGradient(0, yOffset - gradHeight / 2, 0, yOffset + gradHeight / 2);
            gradientStops.forEach(stop => {
                textGrad.addColorStop(stop.offset, stop.color);
            });

            const shadowBaseX = xOffset;
            const shadowBaseY = yOffset;

            textCacheCtx.save();
            textCacheCtx.lineJoin = 'round';

            const shadowPasses = [
                { r: size * 0.07, strokeW: size * 0.12, alpha: 0.025 },
                { r: size * 0.045, strokeW: size * 0.08, alpha: 0.05 },
                { r: size * 0.025, strokeW: size * 0.05, alpha: 0.09 },
                { r: size * 0.01, strokeW: size * 0.03, alpha: 0.15 },
                { r: 0, strokeW: size * 0.02, alpha: 0.25 }
            ];

            const shadowColorPrefix = 'rgba(97, 48, 3, ';

            shadowPasses.forEach(pass => {
                const passColor = shadowColorPrefix + pass.alpha + ')';
                textCacheCtx.strokeStyle = passColor;
                textCacheCtx.fillStyle = passColor;
                textCacheCtx.lineWidth = pass.strokeW;

                if (pass.r === 0) {
                    textCacheCtx.strokeText(text, shadowBaseX, shadowBaseY);
                    textCacheCtx.fillText(text, shadowBaseX, shadowBaseY);
                } else {
                    const angles = 8;
                    for (let i = 0; i < angles; i++) {
                        const angle = (i * Math.PI * 2) / angles;
                        const dx = shadowBaseX + Math.cos(angle) * pass.r;
                        const dy = shadowBaseY + Math.sin(angle) * pass.r;
                        textCacheCtx.strokeText(text, dx, dy);
                        textCacheCtx.fillText(text, dx, dy);
                    }
                }
            });
            textCacheCtx.restore();

            textCacheCtx.save();
            textCacheCtx.strokeStyle = '#613003';
            textCacheCtx.lineWidth = 2;
            textCacheCtx.lineJoin = 'round';
            textCacheCtx.strokeText(text, xOffset, yOffset);

            textCacheCtx.fillStyle = textGrad;
            textCacheCtx.fillText(text, xOffset, yOffset);
            textCacheCtx.restore();
        }

        function normalizeExclamation(str) {
            if (!str) return '';
            return str.replace(/！/g, '!').replace(/？/g, '?');
        }

        function parseTextSegments(str) {
            const normalized = normalizeExclamation(str);
            const segments = [];
            let currentNormal = '';

            for (let i = 0; i < normalized.length; i++) {
                const char = normalized[i];
                if (char === '!' || char === '?') {
                    if (currentNormal) {
                        segments.push({ type: 'normal', text: currentNormal });
                        currentNormal = '';
                    }
                    segments.push({ type: 'special', text: char });
                } else {
                    currentNormal += char;
                }
            }
            if (currentNormal) {
                segments.push({ type: 'normal', text: currentNormal });
            }
            return segments;
        }

        function measureLineWithSpecialChars(str, font) {
            textCacheCtx.font = font;
            const segments = parseTextSegments(str);
            let totalWidth = 0;

            segments.forEach(seg => {
                if (seg.type === 'normal') {
                    totalWidth += textCacheCtx.measureText(seg.text).width;
                } else {
                    const baseW = textCacheCtx.measureText(seg.text).width;
                    totalWidth += baseW * 1.1;
                }
            });

            return totalWidth;
        }

        function drawLineWithSpecialChars(str, font, yOffset, size, gradientStops) {
            textCacheCtx.font = font;
            const segments = parseTextSegments(str);
            const totalWidth = measureLineWithSpecialChars(str, font);

            let currentX = -totalWidth / 2;

            segments.forEach(seg => {
                if (seg.type === 'normal') {
                    textCacheCtx.font = font;
                    const w = textCacheCtx.measureText(seg.text).width;
                    const centerX = currentX + w / 2;
                    drawTextLayers(seg.text, font, centerX, yOffset, size, gradientStops);
                    currentX += w;
                } else {
                    textCacheCtx.font = font;
                    const baseW = textCacheCtx.measureText(seg.text).width;
                    const scaledW = baseW * 1.1;
                    const centerX = currentX + scaledW / 2;

                    const exclamOffsetX = size * 0.06;
                    const exclamOffsetY = size * 0.04;

                    textCacheCtx.save();
                    textCacheCtx.translate(centerX + exclamOffsetX, yOffset + exclamOffsetY);
                    textCacheCtx.scale(1.1, 1.1);
                    textCacheCtx.rotate((15 * Math.PI) / 180);

                    drawTextLayers(seg.text, font, 0, 0, size, gradientStops);

                    textCacheCtx.restore();

                    currentX += scaledW;
                }
            });
        }

        const line1GradStops = [
            { offset: 0.0, color: '#FFFDDC' },
            { offset: 0.33, color: '#FEDF4D' },
            { offset: 0.66, color: '#FF8E1D' },
            { offset: 1.0, color: '#F86F12' }
        ];

        const line2GradStops = [
            { offset: 0.0, color: '#FFFFD7' },
            { offset: 1.0, color: '#F6C13C' }
        ];

        if (state.onlyHyperRecovery) {
            const line1Text = '超回復可能!';

            textCacheCtx.font = `900 ${baseSize}px ${fontStack}`;
            const line1Width = measureLineWithSpecialChars(line1Text, `900 ${baseSize}px ${fontStack}`);

            const slantFactor = 1.05;
            const maxTextWidth = line1Width * slantFactor;
            const maxAllowedWidth = textCacheCanvas.width * 0.88;

            let fitScale = 1.0;
            if (maxTextWidth > maxAllowedWidth) {
                fitScale = maxAllowedWidth / maxTextWidth;
            }

            const sharedFontSize = baseSize * fitScale;
            const sharedFont = `900 ${sharedFontSize}px ${fontStack}`;

            textCacheCtx.save();
            textCacheCtx.translate(centerX, centerY);

            const slantRad = (state.textSlant * Math.PI) / 180;
            textCacheCtx.transform(1, 0, Math.tan(slantRad), 1, 0, 0);

            textCacheCtx.textAlign = 'center';
            textCacheCtx.textBaseline = 'middle';

            drawLineWithSpecialChars(line1Text, sharedFont, 0, sharedFontSize, line1GradStops);

            textCacheCtx.restore();
        } else {
            const line1Text = '超回復';
            const line2FullText = `${state.textKeyword || ''}パワー発動!`;

            textCacheCtx.font = `900 ${baseSize}px ${fontStack}`;
            const line1Width = measureLineWithSpecialChars(line1Text, `900 ${baseSize}px ${fontStack}`);
            const line2Width = measureLineWithSpecialChars(line2FullText, `900 ${baseSize}px ${fontStack}`);

            const slantFactor = 1.05;
            const maxTextWidth = Math.max(line1Width, line2Width) * slantFactor;
            const maxAllowedWidth = textCacheCanvas.width * 0.88;

            let fitScale = 1.0;
            if (maxTextWidth > maxAllowedWidth) {
                fitScale = maxAllowedWidth / maxTextWidth;
            }

            const sharedFontSize = baseSize * fitScale;
            const line1Y = -sharedFontSize * 0.6;
            const line2Y = sharedFontSize * 0.6;
            const sharedFont = `900 ${sharedFontSize}px ${fontStack}`;

            textCacheCtx.save();
            textCacheCtx.translate(centerX, centerY);

            const slantRad = (state.textSlant * Math.PI) / 180;
            textCacheCtx.transform(1, 0, Math.tan(slantRad), 1, 0, 0);

            textCacheCtx.textAlign = 'center';
            textCacheCtx.textBaseline = 'middle';

            drawLineWithSpecialChars(line1Text, sharedFont, line1Y, sharedFontSize, line1GradStops);
            drawLineWithSpecialChars(line2FullText, sharedFont, line2Y, sharedFontSize, line2GradStops);

            textCacheCtx.restore();
        }

        function drawSparkleShape(c) {
            const r = 4;
            c.beginPath();
            c.moveTo(0.00, -10.00);
            c.arcTo(1.06, -1.06, 10.00, 0.00, r);
            c.lineTo(10.00, 0.00);
            c.arcTo(1.06, 1.06, 0.00, 10.00, r);
            c.lineTo(0.00, 10.00);
            c.arcTo(-1.06, 1.06, -10.00, 0.00, r);
            c.lineTo(-10.00, 0.00);
            c.arcTo(-1.06, -1.06, 0.00, -10.00, r);
            c.closePath();
        }

        const scaleFactor = baseSize / 80;
        state.sparkles.forEach(sparkle => {
            const sparkleX = centerX + sparkle.x * scaleFactor;
            const sparkleY = centerY + sparkle.y * scaleFactor;
            const effectiveSize = sparkle.size * scaleFactor;
            const scale = effectiveSize / 20;

            textCacheCtx.save();
            textCacheCtx.translate(sparkleX, sparkleY);

            const shadowPasses = [
                { r: effectiveSize * 0.20, strokeW: effectiveSize * 0.28, alpha: 0.015 },
                { r: effectiveSize * 0.14, strokeW: effectiveSize * 0.20, alpha: 0.03 },
                { r: effectiveSize * 0.09, strokeW: effectiveSize * 0.14, alpha: 0.05 },
                { r: effectiveSize * 0.05, strokeW: effectiveSize * 0.09, alpha: 0.08 },
                { r: effectiveSize * 0.02, strokeW: effectiveSize * 0.05, alpha: 0.12 },
                { r: 0, strokeW: effectiveSize * 0.03, alpha: 0.20 }
            ];

            textCacheCtx.save();
            textCacheCtx.globalAlpha = 0.5;
            textCacheCtx.shadowColor = 'rgba(255, 142, 29, 0.5)';
            textCacheCtx.shadowBlur = effectiveSize * 0.25;

            shadowPasses.forEach(pass => {
                const passColor = `rgba(255, 142, 29, ${pass.alpha})`;
                textCacheCtx.strokeStyle = passColor;
                textCacheCtx.fillStyle = passColor;
                textCacheCtx.lineWidth = pass.strokeW;
                textCacheCtx.lineJoin = 'round';

                if (pass.r === 0) {
                    textCacheCtx.save();
                    textCacheCtx.scale(scale, scale);
                    drawSparkleShape(textCacheCtx);
                    textCacheCtx.stroke();
                    textCacheCtx.fill();
                    textCacheCtx.restore();
                } else {
                    const angles = 8;
                    for (let i = 0; i < angles; i++) {
                        const angle = (i * Math.PI * 2) / angles;
                        const dx = Math.cos(angle) * pass.r;
                        const dy = Math.sin(angle) * pass.r;
                        textCacheCtx.save();
                        textCacheCtx.translate(dx, dy);
                        textCacheCtx.scale(scale, scale);
                        drawSparkleShape(textCacheCtx);
                        textCacheCtx.stroke();
                        textCacheCtx.fill();
                        textCacheCtx.restore();
                    }
                }
            });
            textCacheCtx.restore();

            textCacheCtx.save();
            textCacheCtx.scale(scale, scale);
            drawSparkleShape(textCacheCtx);
            textCacheCtx.fillStyle = '#ffffff';
            textCacheCtx.fill();
            textCacheCtx.restore();

            textCacheCtx.restore();
        });
    }

    // --- Clamp Image Position (Prevent gaps when scale >= 100%) ---
    function clampImagePosition() {
        if (!state.bgImage || state.imgScale < 100) return;

        const rotDeg = state.imgRotation || 0;
        const isSwapped = (rotDeg === 90 || rotDeg === 270);

        const effImgW = isSwapped ? state.bgImage.height : state.bgImage.width;
        const effImgH = isSwapped ? state.bgImage.width : state.bgImage.height;

        const imgRatio = effImgW / effImgH;
        const canvasRatio = canvas.width / canvas.height;
        let renderW, renderH;

        if (imgRatio > canvasRatio) {
            renderH = canvas.height;
            renderW = canvas.height * imgRatio;
        } else {
            renderW = canvas.width;
            renderH = canvas.width / imgRatio;
        }

        const scaleRatio = state.imgScale / 100;
        const finalW = renderW * scaleRatio;
        const finalH = renderH * scaleRatio;

        const maxOffsetX = (finalW - canvas.width) / 2;
        const maxOffsetY = (finalH - canvas.height) / 2;

        const maxImgX = (maxOffsetX / canvas.width) * 100;
        const maxImgY = (maxOffsetY / canvas.height) * 100;

        state.imgX = Math.max(-maxImgX, Math.min(maxImgX, state.imgX));
        state.imgY = Math.max(-maxImgY, Math.min(maxImgY, state.imgY));
    }

    // --- Render Canvas ---
    function renderCanvas() {
        clampImagePosition();

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // 1. Draw Background Image or Default Solid Black
        if (state.bgImage) {
            const rotDeg = state.imgRotation || 0;
            const isSwapped = (rotDeg === 90 || rotDeg === 270);

            const effImgW = isSwapped ? state.bgImage.height : state.bgImage.width;
            const effImgH = isSwapped ? state.bgImage.width : state.bgImage.height;

            const imgRatio = effImgW / effImgH;
            const canvasRatio = canvas.width / canvas.height;
            let renderW, renderH, baseRenderX, baseRenderY;

            if (imgRatio > canvasRatio) {
                renderH = canvas.height;
                renderW = canvas.height * imgRatio;
                baseRenderX = (canvas.width - renderW) / 2;
                baseRenderY = 0;
            } else {
                renderW = canvas.width;
                renderH = canvas.width / imgRatio;
                baseRenderX = 0;
                baseRenderY = (canvas.height - renderH) / 2;
            }

            const scaleRatio = state.imgScale / 100;
            const finalW = renderW * scaleRatio;
            const finalH = renderH * scaleRatio;
            const offsetX = (state.imgX * canvas.width) / 100;
            const offsetY = (state.imgY * canvas.height) / 100;

            const finalCenterX = baseRenderX + renderW / 2 + offsetX;
            const finalCenterY = baseRenderY + renderH / 2 + offsetY;

            ctx.save();
            ctx.translate(finalCenterX, finalCenterY);
            ctx.rotate((rotDeg * Math.PI) / 180);

            const drawW = isSwapped ? finalH : finalW;
            const drawH = isSwapped ? finalW : finalH;
            ctx.drawImage(state.bgImage, -drawW / 2, -drawH / 2, drawW, drawH);
            ctx.restore();
        } else {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Skip text layer rendering if NG word is detected
        if (isNgWordDetected) {
            return;
        }

        // 2. Draw Cached Text Layer
        if (isTextCacheDirty) {
            renderTextToCache();
            isTextCacheDirty = false;
        }

        const centerX = (canvas.width * state.posX) / 100;
        const centerY = (canvas.height * state.posY) / 100;

        ctx.drawImage(textCacheCanvas, centerX - textCacheCanvas.width / 2, centerY - textCacheCanvas.height / 2);
    }

    // --- Interactive Drag & Drop on Canvas (Text or Image) ---
    function getCanvasCoords(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }

    canvas.addEventListener('mousedown', (e) => {
        if (state.isCanvasLocked) return;
        state.isDragging = true;
        state.dragStart = getCanvasCoords(e);
    });

    canvas.addEventListener('touchstart', (e) => {
        if (state.isCanvasLocked) return;
        state.isDragging = true;
        state.dragStart = getCanvasCoords(e);
    }, { passive: true });

    window.addEventListener('mousemove', (e) => {
        if (!state.isDragging) return;
        const coords = getCanvasCoords(e);
        const dx = coords.x - state.dragStart.x;
        const dy = coords.y - state.dragStart.y;
        state.dragStart = coords;

        if (state.dragTarget === 'image') {
            // Drag Image
            state.imgX = Math.max(-100, Math.min(100, state.imgX + (dx / canvas.width) * 100));
            state.imgY = Math.max(-100, Math.min(100, state.imgY + (dy / canvas.height) * 100));
        } else {
            // Drag Text
            state.posX = Math.max(5, Math.min(95, state.posX + (dx / canvas.width) * 100));
            state.posY = Math.max(5, Math.min(95, state.posY + (dy / canvas.height) * 100));

            posXInput.value = Math.round(state.posX);
            posXVal.textContent = `${Math.round(state.posX)}%`;
            posYInput.value = Math.round(state.posY);
            posYVal.textContent = `${Math.round(state.posY)}%`;
        }

        renderCanvas();
    });

    window.addEventListener('touchmove', (e) => {
        if (!state.isDragging) return;
        const coords = getCanvasCoords(e);
        const dx = coords.x - state.dragStart.x;
        const dy = coords.y - state.dragStart.y;
        state.dragStart = coords;

        if (state.dragTarget === 'image') {
            // Drag Image
            state.imgX = Math.max(-100, Math.min(100, state.imgX + (dx / canvas.width) * 100));
            state.imgY = Math.max(-100, Math.min(100, state.imgY + (dy / canvas.height) * 100));
        } else {
            // Drag Text
            state.posX = Math.max(5, Math.min(95, state.posX + (dx / canvas.width) * 100));
            state.posY = Math.max(5, Math.min(95, state.posY + (dy / canvas.height) * 100));

            posXInput.value = Math.round(state.posX);
            posXVal.textContent = `${Math.round(state.posX)}%`;
            posYInput.value = Math.round(state.posY);
            posYVal.textContent = `${Math.round(state.posY)}%`;
        }

        renderCanvas();
    }, { passive: true });

    window.addEventListener('mouseup', () => { state.isDragging = false; });
    window.addEventListener('touchend', () => { state.isDragging = false; });

    // --- Image File Upload Handlers (Native Decode First -> heic2any Fallback) ---
    function handleFile(file) {
        if (!file) return;

        const isHeic = file.name && (file.name.toLowerCase().endsWith('.heic') ||
            file.name.toLowerCase().endsWith('.heif')) ||
            file.type === 'image/heic' ||
            file.type === 'image/heif';

        if (!isHeic && file.type && !file.type.startsWith('image/')) {
            showToast('画像ファイルを選択してください');
            return;
        }

        // Step 1: Try Native Image Loading (Safari / iOS natively loads HEIC images)
        const objectUrl = URL.createObjectURL(file);
        const img = new Image();

        img.onload = () => {
            state.bgImage = img;
            state.imgRotation = 0;
            renderCanvasSafe(50);
            showToast('画像を読み込みました');
        };

        img.onerror = async () => {
            URL.revokeObjectURL(objectUrl);

            // Step 2: Fallback to JS heic2any for browsers that don't support native HEIC (e.g. Chrome on Windows/Android)
            if (isHeic) {
                showToast('HEIC画像を変換中...', 4000);
                try {
                    if (typeof heic2any === 'undefined') {
                        showToast('HEIC画像の変換に対応していません。JPEG/PNG画像をご利用ください');
                        return;
                    }

                    const heicBlob = new Blob([file], { type: 'image/heic' });
                    const convertedBlob = await heic2any({
                        blob: heicBlob,
                        toType: 'image/jpeg',
                        quality: 0.92
                    });

                    const targetBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
                    readBlobAndRender(targetBlob);
                } catch (err) {
                    console.error('HEIC conversion error:', err);
                    showToast('HEIC画像の変換に対応していません。JPEG/PNG形式をお試しください', 4000);
                }
            } else {
                showToast('画像の読み込みに失敗しました');
            }
        };

        img.src = objectUrl;
    }

    function readBlobAndRender(blob) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                state.bgImage = img;
                state.imgRotation = 0;
                renderCanvasSafe(50);
                showToast('画像を読み込みました');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(blob);
    }

    dropzone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    // Paste Image via Button (Clipboard API for mobile/desktop)
    if (pasteImgBtn) {
        pasteImgBtn.addEventListener('click', async () => {
            try {
                if (!navigator.clipboard || !navigator.clipboard.read) {
                    showToast('お使いのブラウザはクリップボードの読み取りに対応していません');
                    return;
                }
                const clipboardItems = await navigator.clipboard.read();
                let imageFound = false;

                for (const item of clipboardItems) {
                    const imageType = item.types.find(type => type.startsWith('image/'));
                    if (imageType) {
                        const blob = await item.getType(imageType);
                        handleFile(blob);
                        imageFound = true;
                        break;
                    }
                }

                if (!imageFound) {
                    showToast('クリップボードに画像が見つかりませんでした');
                }
            } catch (err) {
                console.error(err);
                showToast('クリップボードの画像読み取りに失敗しました（権限が必要です）');
            }
        });
    }

    // Rotate Image Left Button (Rotate 90 degrees counter-clockwise)
    if (rotateImgLeftBtn) {
        rotateImgLeftBtn.addEventListener('click', () => {
            if (!state.bgImage) {
                showToast('回転する画像が選択されていません');
                return;
            }
            state.imgRotation = (state.imgRotation + 270) % 360;
            renderCanvas();
            showToast(`画像を ${state.imgRotation}° 回転しました`);
        });
    }

    // Rotate Image Right Button (Rotate 90 degrees clockwise)
    if (rotateImgRightBtn) {
        rotateImgRightBtn.addEventListener('click', () => {
            if (!state.bgImage) {
                showToast('回転する画像が選択されていません');
                return;
            }
            state.imgRotation = (state.imgRotation + 90) % 360;
            renderCanvas();
            showToast(`画像を ${state.imgRotation}° 回転しました`);
        });
    }

    // Reset Image Button
    if (resetImgBtn) {
        resetImgBtn.addEventListener('click', () => {
            state.bgImage = null;
            state.imgRotation = 0;
            state.imgX = 0;
            state.imgY = 0;
            state.imgScale = 100;
            fileInput.value = '';
            if (imgScaleInput) {
                imgScaleInput.value = 100;
                imgScaleVal.textContent = '100%';
            }
            renderCanvasSafe(50);
            showToast('選択中の画像をリセットしました');
        });
    }

    // Paste Image from Keyboard Shortcut (Ctrl+V / Cmd+V)
    window.addEventListener('paste', (e) => {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (let item of items) {
            if (item.kind === 'file' && item.type.startsWith('image/')) {
                const blob = item.getAsFile();
                handleFile(blob);
                break;
            }
        }
    });

    const redrawBtn = document.getElementById('redrawBtn');
    if (redrawBtn) {
        redrawBtn.addEventListener('click', () => {
            renderCanvasSafe(0);
            showToast('キャンバスを再描画しました');
        });
    }

    // --- Input Control Listeners ---
    if (onlyHyperRecoveryCheckbox) {
        onlyHyperRecoveryCheckbox.addEventListener('change', (e) => {
            state.onlyHyperRecovery = e.target.checked;
            if (textKeywordInput) textKeywordInput.disabled = state.onlyHyperRecovery;
            if (redrawBtn) redrawBtn.disabled = state.onlyHyperRecovery;

            if (state.onlyHyperRecovery) {
                if (keywordInputGroup) keywordInputGroup.classList.add('disabled');
                if (presetsWrapper) presetsWrapper.classList.add('disabled');
            } else {
                if (keywordInputGroup) keywordInputGroup.classList.remove('disabled');
                if (presetsWrapper) presetsWrapper.classList.remove('disabled');
            }

            validateKeywordInput();
            renderCanvasSafe(0);
        });
    }

    if (canvasLockCheckbox) {
        canvasLockCheckbox.addEventListener('change', (e) => {
            state.isCanvasLocked = e.target.checked;
            if (state.isCanvasLocked) {
                if (canvasCard) canvasCard.classList.add('canvas-locked');
                if (canvasLockToggle) canvasLockToggle.classList.add('is-locked');
                showToast('キャンバス操作をロックしました');
            } else {
                if (canvasCard) canvasCard.classList.remove('canvas-locked');
                if (canvasLockToggle) canvasLockToggle.classList.remove('is-locked');
                showToast('キャンバス操作のロックを解除しました');
            }
        });
    }

    textKeywordInput.addEventListener('input', (e) => {
        let val = e.target.value.replace(/！/g, '!').replace(/？/g, '?');
        if (val.length > 20) {
            val = val.slice(0, 20);
        }
        e.target.value = val;
        state.textKeyword = val;
        validateKeywordInput();
    });

    presetChips.forEach(chip => {
        chip.addEventListener('click', () => {
            if (state.onlyHyperRecovery) return;
            let presetVal = (chip.getAttribute('data-preset') || '').slice(0, 20);
            presetVal = presetVal.replace(/！/g, '!').replace(/？/g, '?');
            textKeywordInput.value = presetVal;
            state.textKeyword = presetVal;
            validateKeywordInput();
        });
    });

    textSizeInput.addEventListener('input', (e) => {
        state.textSize = parseInt(e.target.value, 10);
        textSizeVal.textContent = state.textSize;
        markTextCacheDirty();
        renderCanvas();
    });

    posYInput.addEventListener('input', (e) => {
        state.posY = parseInt(e.target.value, 10);
        posYVal.textContent = `${state.posY}%`;
        renderCanvas();
    });

    posXInput.addEventListener('input', (e) => {
        state.posX = parseInt(e.target.value, 10);
        posXVal.textContent = `${state.posX}%`;
        renderCanvas();
    });

    if (imgScaleInput) {
        imgScaleInput.addEventListener('input', (e) => {
            state.imgScale = parseInt(e.target.value, 10);
            imgScaleVal.textContent = `${state.imgScale}%`;
            renderCanvas();
        });
    }

    dragTargetRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.checked) {
                state.dragTarget = e.target.value;
            }
        });
    });

    // Buttons
    if (shuffleSparklesBtn) {
        shuffleSparklesBtn.addEventListener('click', () => {
            state.sparkles = generateRandomSparkles();
            markTextCacheDirty();
            renderCanvas();
            showToast('キラキラの配置をシャッフルしました');
        });
    }

    resetBtn.addEventListener('click', () => {
        state.textSize = 70;
        state.posX = 50;
        state.posY = 75;
        state.imgX = 0;
        state.imgY = 0;
        state.imgScale = 100;
        state.imgRotation = 0;
        state.dragTarget = 'image';
        state.onlyHyperRecovery = false;
        state.isCanvasLocked = false;
        state.sparkles = generateRandomSparkles();

        if (onlyHyperRecoveryCheckbox) onlyHyperRecoveryCheckbox.checked = false;
        if (keywordInputGroup) keywordInputGroup.classList.remove('disabled');
        if (presetsWrapper) presetsWrapper.classList.remove('disabled');
        if (textKeywordInput) textKeywordInput.disabled = false;
        if (redrawBtn) redrawBtn.disabled = false;

        if (canvasLockCheckbox) canvasLockCheckbox.checked = false;
        if (canvasCard) canvasCard.classList.remove('canvas-locked');
        if (canvasLockToggle) canvasLockToggle.classList.remove('is-locked');

        dragTargetRadios.forEach(radio => {
            radio.checked = (radio.value === 'image');
        });

        textSizeInput.value = 70;
        textSizeVal.textContent = '70';
        posXInput.value = 50;
        posXVal.textContent = '50%';
        posYInput.value = 75;
        posYVal.textContent = '75%';

        if (imgScaleInput) {
            imgScaleInput.value = 100;
            imgScaleVal.textContent = '100%';
        }

        // Reset aspect ratio to default 3:2
        if (aspectDropdownMenu) {
            const items = aspectDropdownMenu.querySelectorAll('.dropdown-item');
            items.forEach(i => {
                const isDefault = i.getAttribute('data-aspect') === '3:2';
                i.classList.toggle('active', isDefault);
                i.setAttribute('aria-selected', isDefault ? 'true' : 'false');
                if (isDefault) {
                    const itemSvg = i.querySelector('svg');
                    const itemSpan = i.querySelector('span');
                    if (itemSvg && aspectSelectedIcon) aspectSelectedIcon.innerHTML = itemSvg.outerHTML;
                    if (itemSpan && aspectSelectedText) aspectSelectedText.textContent = itemSpan.textContent;
                }
            });
        }
        updateCanvasDimensions('3:2');

        renderCanvasSafe(50);
        showToast('設定をリセットしました');
    });

    // --- Generate & Share Handlers ---
    function getGeneratedDataURL() {
        return canvas.toDataURL('image/png');
    }

    // Record saved/copied state on image preview right-click or long press
    if (shareImagePreview) {
        shareImagePreview.addEventListener('contextmenu', () => {
            hasSavedOrCopied = true;
        });

        let pressTimer = null;
        const startPress = () => {
            pressTimer = setTimeout(() => {
                hasSavedOrCopied = true;
            }, 400);
        };
        const cancelPress = () => {
            if (pressTimer) {
                clearTimeout(pressTimer);
                pressTimer = null;
            }
        };
        shareImagePreview.addEventListener('touchstart', startPress, { passive: true });
        shareImagePreview.addEventListener('touchend', cancelPress, { passive: true });
        shareImagePreview.addEventListener('touchcancel', cancelPress, { passive: true });
        shareImagePreview.addEventListener('pointerdown', startPress);
        shareImagePreview.addEventListener('pointerup', cancelPress);
        shareImagePreview.addEventListener('pointercancel', cancelPress);
    }

    generateBtn.addEventListener('click', () => {
        if (!state.onlyHyperRecovery && isNgWordDetected) {
            showToast('エラーが発生しました');
            return;
        }
        const dataUrl = getGeneratedDataURL();
        shareImagePreview.src = dataUrl;

        if (shareStep1) shareStep1.style.display = '';

        // Twitter Intent Link Setup
        const shareText = state.onlyHyperRecovery
            ? '「超回復可能!」画像を作成しました！\n#なんでも超回復メーカー #ウマ娘'
            : `「超回復 ${state.textKeyword || '温泉'}パワー発動!」画像を作成しました！\n#なんでも超回復メーカー #ウマ娘`;
        const text = encodeURIComponent(shareText);
        const twitterUrl = `https://twitter.com/intent/tweet?text=${text}`;
        twitterShareBtn.href = twitterUrl;

        shareModal.classList.add('active');
    });

    downloadModalBtn.addEventListener('click', () => {
        const dataUrl = getGeneratedDataURL();
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `hyper_recovery_${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast('画像を保存しました');
    });

    if (copyImageBtn) {
        copyImageBtn.addEventListener('click', async () => {
            if (!navigator.clipboard || !navigator.clipboard.write) {
                showToast('お使いの環境ではコピーに対応していません');
                return;
            }
            try {
                canvas.toBlob(async (blob) => {
                    if (blob) {
                        try {
                            const item = new ClipboardItem({ 'image/png': blob });
                            await navigator.clipboard.write([item]);
                            showToast('画像をクリップボードにコピーしました');
                        } catch (err) {
                            console.error(err);
                            showToast('コピーに失敗しました');
                        }
                    } else {
                        showToast('画像の生成に失敗しました');
                    }
                });
            } catch (err) {
                console.error(err);
                showToast('コピーに失敗しました');
            }
        });
    }

    closeModalBtn.addEventListener('click', () => {
        shareModal.classList.remove('active');
    });

    shareModal.addEventListener('click', (e) => {
        if (e.target === shareModal) {
            shareModal.classList.remove('active');
        }
    });

    // Prevent double-tap zoom on mobile devices (e.g. iOS Safari)
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
            const target = e.target;
            const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
            if (!isInputField) {
                e.preventDefault();
            }
        }
        lastTouchEnd = now;
    }, { passive: false });

    // Initial Setup: Load NG words and render Canvas safely once WebFont is ready
    loadNgWords();
    renderCanvasSafe(100);
});
