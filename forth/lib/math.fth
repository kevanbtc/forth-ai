\ Simple math utilities (gforth-compatible)

\ factorial ( n -- n! )
: fact ( n -- n! )
  dup 0< IF drop -1 EXIT THEN
  dup 1 <= IF drop 1 EXIT THEN
  1 swap 1 DO I * LOOP ;

\ fibonacci ( n -- F(n) ) 0->0 1->1
: fib ( n -- f )
  dup 0< IF drop -1 EXIT THEN
  dup 2 < IF EXIT THEN
  0 1 rot 2 ?DO over over + nip LOOP nip ;

\ gcd ( a b -- gcd )
: gcd ( a b -- g )
  BEGIN dup 0<> WHILE over over mod swap drop REPEAT drop ;

\ is-prime? ( n -- flag ) 1/0
: is-prime? ( n -- f )
  dup 2 < IF drop 0 EXIT THEN
  dup 2 = IF drop 1 EXIT THEN
  dup 2 mod 0= IF drop 0 EXIT THEN
  dup >r 3
  BEGIN dup dup * r@ <= WHILE
    r@ over mod 0= IF drop rdrop 0 EXIT THEN
    2 + 
  REPEAT drop rdrop 1 ;