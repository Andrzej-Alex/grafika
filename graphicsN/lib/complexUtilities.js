class Mobius {

    constructor(a, b, c, d) {
        this.a = new Complex(a);
        this.b = new Complex(b);
        this.c = new Complex(c);
        this.d = new Complex(d);
        if ((this.a).mul(this.d).sub((this.b).mul(this.c)) == 0) {
            throw new Error('determinant cannot be zero');
        }
    }

    eval(z) {
        if (z === Complex.INFINITY) {
            return (this.a.div(this.c));
        }
        const denominator = (this.c).mul(z).add(this.d);
        if (denominator == 0) {
            return Complex.INFINITY;
        } else {
            let numerator = (this.a).mul(z).add(this.b);
            return numerator.div(denominator);
        }
    }

    compose(m1) {
        let a = (this.a).mul(m1.a).add((this.b).mul(m1.c));
        let b = (this.a).mul(m1.b).add((this.b).mul(m1.d));
        let c = (this.c).mul(m1.a).add((this.d).mul(m1.c));
        let d = (this.c).mul(m1.b).add((this.d).mul(m1.d));
        return new Mobius(a, b, c, d);
    }

    inverse() {
        return new Mobius(this.d.neg(), this.b, this.c, this.a.neg());
    }

    trace() {
        return this.a.add(this.d);
    }

    // (a-d +- sqrt((Tr)^2 - 4)) / 2c = (A +- B)/C
    // assumes this.det() == 1
    // Indira's Pearls, Chapter 3, page 78
    fixedPoints() {
        if (this.det() != 1)
            throw new Error('function fixedPoints assumes determinant is one');
        let A = this.a.sub(this.d);
        let trace = this.trace();
        let B = trace.mul(trace).sub(4).sqrt();
        let C = this.c.mul(2);
        let res1 = A.add(B).div(C);
        let res2 = A.sub(B).div(C);
        return [res1, res2];
    }

    // given circle C with center p and radius r, return the center and
    // radius of circle under this Mobius transformation.
    // See Indra's Pearls, Chapter 3 (p. 91)
    evalCircle(p, r) {
        p = new Complex(p);
        r = new Complex(r);
        let z = p.sub(r.mul(r).div(this.d.div(this.c).add(p).conjugate()));
        let q = this.eval(z);
        let s = q.sub(this.eval(p.add(r))).abs();
        return [q, s];
    }

    det() {
        return this.a.mul(this.d).sub(this.b.mul(this.c));
    }

    normalize() {
        let denom = this.det().sqrt();
        let a = this.a.div(denom);
        let b = this.b.div(denom);
        let c = this.c.div(denom);
        let d = this.d.div(denom);
        return new Mobius(a, b, c, d);
    }

    static identity() {
        return new Mobius(1, 0, 0, 1);
    }

    // map that sends z1, z2, z3 to 0, 1, infinity
    static toZeroOneInfinity2(z1, z2, z3) {
        z1 = new Complex(z1);
        z2 = new Complex(z2);
        z3 = new Complex(z3);
        let a = z2.sub(z3);
        let b = z1.neg().mul(a);
        let c = z2.sub(z1);
        let d = z3.neg().mul(c);
        return new Mobius(a, b, c, d).normalize();
    }

/**
 * if z1 = infinity, (z2-z3)/(z-z3)
 * if z2 = infinity, (z-z1)/(z-z3)
 * if z3 = infinity, (z-z1)/(z2-z1)
 **/
 // Note new Complex(Complex.INFINITY) != Complex.INFINITY. Perverse!!
    static toZeroOneInfinity(z1, z2, z3) {
        z1 = (z1 == Complex.INFINITY) ? z1 : new Complex(z1);
        z2 = (z2 == Complex.INFINITY) ? z2 : new Complex(z2);
        z3 = (z3 == Complex.INFINITY) ? z3 : new Complex(z3);
        let m = null;
        if ((z1 != Complex.INFINITY) && (z2 != Complex.INFINITY) && (z3 != Complex.INFINITY)) {
            let a = z2.sub(z3);
            let b = z1.neg().mul(a);
            let c = z2.sub(z1);
            let d = z3.neg().mul(c);
            m = new Mobius(a, b, c, d);
        } else if (z1 == Complex.INFINITY) {
            m = new Mobius(0, z2.sub(z3), 1, z3.neg());
        } else if (z2 == Complex.INFINITY) {
            m = new Mobius(1, z1.neg(), 1, z3.neg());
        } else { // z3 == Complex.INFINITY
            m = new Mobius(1, z1.neg(), 0, z2.sub(z1));
        }
        return m.normalize();
    }

    // map that sends z1, z2, z3 to w1, w2, w3
    static toW1W2W3(z1, z2, z3, w1, w2, w3) {
        let f = Mobius.toZeroOneInfinity(z1, z2, z3);
        let g = Mobius.toZeroOneInfinity(w1, w2, w3);
        let ginv = g.inverse();
        return ginv.compose(f).normalize();
    }

}

export { Mobius };