// SPDX-License-Identifier: MIT
/*
   Copyright (c) 2024, SCANOSS

   Permission is hereby granted, free of charge, to any person obtaining a copy
   of this software and associated documentation files (the "Software"), to deal
   in the Software without restriction, including without limitation the rights
   to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   copies of the Software, and to permit persons to whom the Software is
   furnished to do so, subject to the following conditions:

   The above copyright notice and this permission notice shall be included in
   all copies or substantial portions of the Software.

   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
   IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
   FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
   AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
   LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
   OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
   THE SOFTWARE.
 */

export const generateTable = (headers: string[], rows: string[][], centeredColumns?: number[]): string => {
  const COL_SEP = ' | ';
  const centeredColumnMapper: Set<number> = new Set<number>();
  if (centeredColumns) centeredColumns.forEach(c => centeredColumnMapper.add(c));

  const rowSeparator =
    COL_SEP +
    headers
      .map((header, index) => {
        if (!centeredColumns) return '-';
        return centeredColumnMapper.has(index) ? ':-:' : '-';
      })
      .join(COL_SEP) +
    COL_SEP;

  return `
  ${COL_SEP} ${headers.join(COL_SEP)} ${COL_SEP}                                     
  ${rowSeparator}      
  ${rows.map(row => COL_SEP + row.join(COL_SEP) + COL_SEP).join('\n')}       
  `;
};
