\ Minimal test harness
variable tests  0 tests !
variable fails  0 fails !

: ASSERT= ( got expected -- )
  tests @ 1 + tests !
  2dup = IF 2drop EXIT THEN
  ." FAIL: expected " dup . ."  got " swap . cr
  fails @ 1 + fails ! ;

: SUMMARY ( -- )
  cr tests @ . ."  tests / " fails @ . ."  fails" cr
  fails @ IF -1 EXIT THEN 0 ;

\ Bring in the math lib and run assertions
s" ./forth/lib/math.fth" included

\ fact
5 fact 120 ASSERT=
0 fact 1 ASSERT=
1 fact 1 ASSERT=
-3 fact -1 ASSERT=  \ negative guard

\ fib
0 fib 0 ASSERT=
1 fib 1 ASSERT=
10 fib 55 ASSERT=

\ gcd
54 24 gcd 6 ASSERT=
17 13 gcd 1 ASSERT=
42 0 gcd 42 ASSERT=

\ prime
2 is-prime? 1 ASSERT=
3 is-prime? 1 ASSERT=
4 is-prime? 0 ASSERT=
97 is-prime? 1 ASSERT=
1 is-prime? 0 ASSERT=

SUMMARY bye