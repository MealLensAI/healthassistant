const AboutSection = () => {
  return (
    <section id="about" className="py-24 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          {/* Left: Vision & Mission */}
          <div>
            <h2 className="text-3xl lg:text-4xl font-normal mb-12">
              About MealLensAI
            </h2>
            
            <div className="space-y-10">
              <div>
                <h3 className="font-medium text-lg mb-3">What we do</h3>
                <p className="text-muted-foreground leading-relaxed">
                  We are building an AI solution for people with chronic condition, using food to maintain and restore or improve people's health. We are using food to maintain and restore or improve patient health with chronic conditions.
                </p>
              </div>
              
              <div>
                <h3 className="font-medium text-lg mb-3">Our approach</h3>
                <p className="text-muted-foreground leading-relaxed">
                  If you have a chronic condition, tell our AI your sickness, and it recommends food that you can eat that will maintain your health and give you better health. At the same time, it can also restore or improve your health based on your health condition.
                </p>
              </div>
            </div>
          </div>

          {/* Right: Who we serve */}
          <div className="bg-card rounded-lg p-8 lg:p-10 border border-border">
            <h3 className="text-xl font-normal mb-8">Our customers</h3>
            
            <div className="space-y-8">
              <div>
                <h4 className="font-medium text-primary mb-4">People with chronic condition</h4>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                  Our primary customers are people with chronic condition who need personalized food recommendations to maintain and restore or improve their health conditions.
                </p>
              </div>
              
              <div>
                <h4 className="font-medium text-primary mb-4">Nutritionists and Dietitians</h4>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                  Nutritionists and dietitians currently do all these things manually. With our product, they won't need to do everything manually. They will just use MealLensAI and it will automatically do everything for them.
                </p>
              </div>

              <div>
                <h4 className="font-medium text-primary mb-4">Insurance Companies</h4>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Insurance companies need to save money. People with health insurance can use our product, and it will automatically reduce the amount of money they spend on treating people with sickness, getting them better health, and reducing the amount of costs the company spends.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
