export const generateTable = (headers: string[], rows: string[][]): string => {
  const COL_SEP = ' | ';

  return `
  ${COL_SEP} ${headers.join(COL_SEP)} ${COL_SEP}                                     
  ${COL_SEP + new Array(headers.length).fill('-').join(COL_SEP) + COL_SEP}      
  ${rows.map(row => COL_SEP + row.join(COL_SEP) + COL_SEP).join('\n')}       
  `;
};
