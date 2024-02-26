export const generateTable = (headers: string[], rows: string[][]): string => {
  const COL_SEP = ' | ';
  const LINE_BREAK = ' \n ';

  let md = COL_SEP + headers.join(COL_SEP) + COL_SEP + LINE_BREAK;
  md += COL_SEP + new Array(headers.length).fill('-').join(COL_SEP) + COL_SEP + LINE_BREAK;

  rows.forEach(row => {
    md += COL_SEP + row.join(COL_SEP) + COL_SEP + LINE_BREAK;
  });

  return md;
};
